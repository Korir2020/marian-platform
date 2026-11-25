import hashlib
import hmac
import json

from django.db import connection, transaction
from django.core.management.color import no_style
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from authoring.marian_perms import has_role, scope_to_school
from catalog.models import Pathway, Course, Module, Topic, EditorialState
from authoring.models import Lesson, LessonVersion, Assessment, Project, RubricCriterion
from .serializers import ImportPackageSerializer

EDITOR_ROLES = ('content_creator', 'curator', 'administrator')

def _require_editor(user):
    if not has_role(user, *EDITOR_ROLES):
        raise PermissionDenied('A content creator role is required for content portability operations.')

def _lesson_data(lesson):
    return {'id': lesson.pk, 'title': lesson.title, 'state': lesson.state,
            'versions': [{'id': v.pk, 'number': v.number, 'objectives': v.objectives,
                          'blocks': v.blocks, 'revision_notes': v.revision_notes,
                          'created_at': v.created_at.isoformat(), 'author_id': v.author_id}
                         for v in lesson.versions.all()],
            'current_version_id': lesson.current_version_id,
            'approved_version_id': lesson.approved_version_id,
            'published_version_id': lesson.published_version_id}

def build_package(queryset=None, user=None):
    pathways = (queryset if queryset is not None else Pathway.objects.all()).prefetch_related(
        'courses__modules__topics__lessons__versions', 'courses__assessments', 'courses__projects__rubric_criteria')
    def vis(o):
        return (user is None or user.is_superuser
                or o.status == EditorialState.PUBLISHED
                or o.created_by_id == user.id)
    output = []
    if user is not None:
        ok_l = set(scope_to_school(Lesson.objects.all(), user).values_list('pk', flat=True))
        ok_a = set(scope_to_school(Assessment.objects.all(), user).values_list('pk', flat=True))
        ok_p = set(scope_to_school(Project.objects.all(), user).values_list('pk', flat=True))
    for p in [x for x in pathways if vis(x)]:
        pd = {'id': p.pk, 'title': p.title, 'slug': p.slug, 'description': p.description,
              'position': p.position, 'status': p.status, 'courses': []}
        for c in [x for x in p.courses.all() if vis(x)]:
            cd = {'id': c.pk, 'title': c.title, 'description': c.description, 'position': c.position,
                  'level': c.level, 'status': c.status, 'modules': [], 'assessments': [], 'projects': []}
            for m in [x for x in c.modules.all() if vis(x)]:
                md = {'id': m.pk, 'title': m.title, 'description': m.description, 'position': m.position,
                      'status': m.status, 'topics': []}
                for t in [x for x in m.topics.all() if vis(x)]:
                    td = {'id': t.pk, 'title': t.title, 'description': t.description, 'position': t.position,
                          'status': t.status, 'lessons': [_lesson_data(l) for l in t.lessons.all() if user is None or l.pk in ok_l]}
                    md['topics'].append(td)
                cd['modules'].append(md)
            for a in [x for x in c.assessments.all() if user is None or x.pk in ok_a]:
                cd['assessments'].append({'id': a.pk, 'title': a.title, 'description': a.description,
                    'kind': a.kind, 'instructions': a.instructions, 'time_limit_minutes': a.time_limit_minutes,
                    'pass_mark_percent': a.pass_mark_percent, 'questions': a.questions, 'state': a.state})
            for pr in [x for x in c.projects.all() if user is None or x.pk in ok_p]:
                cd['projects'].append({'id': pr.pk, 'title': pr.title, 'brief': pr.brief,
                    'learning_outcomes': pr.learning_outcomes, 'requirements': pr.requirements,
                    'deliverables': pr.deliverables, 'estimated_hours': pr.estimated_hours, 'state': pr.state,
                    'rubric_criteria': [{'id': r.pk, 'title': r.title, 'description': r.description, 'points': r.points, 'position': r.position} for r in pr.rubric_criteria.all()]})
            pd['courses'].append(cd)
        output.append(pd)
    package = {'format': 'marian-content-package', 'schema_version': 1,
               'exported_at': timezone.now().isoformat(), 'pathways': output}
    canonical = json.dumps(package, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
    package['checksum'] = {'algorithm': 'sha256', 'value': hashlib.sha256(canonical).hexdigest()}
    return package

class ContentExportView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        _require_editor(request.user)
        qs = Pathway.objects.all()
        pathway_id = request.query_params.get('pathway')
        if pathway_id:
            qs = qs.filter(pk=pathway_id)
            if not qs.exists(): raise ValidationError({'pathway': 'Pathway not found.'})
        return Response(build_package(qs, user=request.user))

def _package_conflicts(package):
    """Find primary-key and natural-key conflicts before opening the write transaction."""
    conflicts = []
    checks = (
        (Pathway, package.get('pathways', []), 'pathway', ('slug', 'title')),
    )
    for model, rows, label, natural_fields in checks:
        for row in rows:
            object_id = row.get('id')
            if object_id and model.objects.filter(pk=object_id).exists():
                conflicts.append({'type': label, 'id': object_id, 'reason': 'id_exists'})
            if any(model.objects.filter(**{field: row.get(field)}).exists() for field in natural_fields if row.get(field)):
                conflicts.append({'type': label, 'id': object_id, 'reason': 'natural_key_exists'})
            for course in row.get('courses', []):
                for child_model, children, child_label in (
                    (Course, [course], 'course'),
                    (Module, course.get('modules', []), 'module'),
                    (Topic, [topic for module in course.get('modules', []) for topic in module.get('topics', [])], 'topic'),
                    (Lesson, [lesson for module in course.get('modules', []) for topic in module.get('topics', []) for lesson in topic.get('lessons', [])], 'lesson'),
                    (Assessment, course.get('assessments', []), 'assessment'),
                    (Project, course.get('projects', []), 'project'),
                    (LessonVersion, [version for module in course.get('modules', []) for topic in module.get('topics', []) for lesson in topic.get('lessons', []) for version in lesson.get('versions', [])], 'lesson_version'),
                    (RubricCriterion, [criterion for project in course.get('projects', []) for criterion in project.get('rubric_criteria', [])], 'rubric_criterion'),
                ):
                    for child in children:
                        child_id = child.get('id')
                        if child_id and child_model.objects.filter(pk=child_id).exists():
                            conflicts.append({'type': child_label, 'id': child_id, 'reason': 'id_exists', 'pathway_id': object_id})
    return conflicts


def _package_counts(package):
    counts = {'pathways': 0, 'courses': 0, 'modules': 0, 'topics': 0, 'lessons': 0, 'assessments': 0, 'projects': 0, 'lesson_versions': 0, 'rubric_criteria': 0}
    for pathway in package.get('pathways', []):
        counts['pathways'] += 1
        for course in pathway.get('courses', []):
            counts['courses'] += 1
            counts['assessments'] += len(course.get('assessments', []))
            counts['projects'] += len(course.get('projects', []))
            for project in course.get('projects', []):
                counts['rubric_criteria'] += len(project.get('rubric_criteria', []))
            for module in course.get('modules', []):
                counts['modules'] += 1
                for topic in module.get('topics', []):
                    counts['topics'] += 1
                    for lesson in topic.get('lessons', []):
                        counts['lessons'] += 1
                        counts['lesson_versions'] += len(lesson.get('versions', []))
    return counts


class ContentImportView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        _require_editor(request.user)
        if not request.user.is_superuser:
            raise PermissionDenied('Only platform administrators may import content packages.')
        serializer = ImportPackageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        package = serializer.validated_data['package']
        policy = serializer.validated_data['conflict_policy']
        dry_run = serializer.validated_data['dry_run']
        expected = package.get('checksum')
        if expected:
            if expected.get('algorithm') != 'sha256' or not expected.get('value'):
                raise ValidationError({'package': 'Unsupported checksum declaration.'})
            unsigned = {key: value for key, value in package.items() if key != 'checksum'}
            canonical = json.dumps(unsigned, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
            actual = hashlib.sha256(canonical).hexdigest()
            if not hmac.compare_digest(actual, expected['value']):
                raise ValidationError({'package': 'Checksum verification failed; package may be corrupted.'})
        conflicts = _package_conflicts(package)
        counts = _package_counts(package)
        if conflicts and policy == 'reject':
            raise ValidationError({'conflicts': conflicts, 'detail': 'Import rejected; no content was changed.'})
        if dry_run:
            return Response({'status': 'dry_run', 'would_create': counts, 'conflicts': conflicts,
                             'conflict_policy': policy, 'publication': 'disabled'})
        created = {'pathways': 0, 'courses': 0, 'modules': 0, 'topics': 0, 'lessons': 0, 'assessments': 0, 'projects': 0}
        skipped = []
        conflict_pathways = {item.get('pathway_id', item.get('id')) for item in conflicts}
        try:
            with transaction.atomic():
                for p in package['pathways']:
                    old_id = p.get('id')
                    if policy == 'skip' and (old_id in conflict_pathways or any(x.get('type') == 'pathway' and x.get('id') == old_id for x in conflicts)):
                        skipped.append({'type': 'pathway', 'id': old_id, 'reason': 'nested_or_pathway_conflict'}); continue
                    if old_id and Pathway.objects.filter(pk=old_id).exists():
                        raise ValidationError(f'Pathway ID conflict: {old_id}.')
                    pathway = Pathway.objects.create(id=old_id, title=p['title'], slug=p['slug'], description=p.get('description',''), position=p.get('position',0), status='draft', created_by=request.user); created['pathways'] += 1
                    for c in p.get('courses', []):
                        cid=c.get('id')
                        if cid and Course.objects.filter(pk=cid).exists(): raise ValidationError(f'Course ID conflict: {cid}.')
                        course=Course.objects.create(id=cid, pathway=pathway, title=c['title'], description=c.get('description',''), position=c.get('position',0), level=c.get('level',''), status='draft', created_by=request.user); created['courses']+=1
                        for m in c.get('modules',[]):
                            mid=m.get('id')
                            if mid and Module.objects.filter(pk=mid).exists(): raise ValidationError(f'Module ID conflict: {mid}.')
                            module=Module.objects.create(id=mid,course=course,title=m['title'],description=m.get('description',''),position=m.get('position',0),status='draft',created_by=request.user); created['modules']+=1
                            for t in m.get('topics',[]):
                                tid=t.get('id')
                                if tid and Topic.objects.filter(pk=tid).exists(): raise ValidationError(f'Topic ID conflict: {tid}.')
                                topic=Topic.objects.create(id=tid,module=module,title=t['title'],description=t.get('description',''),position=t.get('position',0),status='draft',created_by=request.user); created['topics']+=1
                                for l in t.get('lessons',[]):
                                    lid=l.get('id')
                                    if lid and Lesson.objects.filter(pk=lid).exists(): raise ValidationError(f'Lesson ID conflict: {lid}.')
                                    lesson=Lesson.objects.create(id=lid,topic=topic,title=l['title'],owner=request.user,state='draft'); created['lessons']+=1
                                    versions=[]
                                    for v in l.get('versions',[]):
                                        version=LessonVersion.objects.create(id=v.get('id'),lesson=lesson,number=v['number'],author=request.user,objectives=v.get('objectives',[]),blocks=v.get('blocks',[]),revision_notes=v.get('revision_notes','')); versions.append(version)
                                    if versions:
                                        lesson.current_version=next((v for v in versions if v.number == max(x.number for x in versions)), versions[-1]); lesson.save(update_fields=['current_version'])
                        for a in c.get('assessments',[]):
                            Assessment.objects.create(id=a.get('id'),course=course,title=a['title'],description=a.get('description',''),kind=a.get('kind','quiz'),instructions=a.get('instructions',''),time_limit_minutes=a.get('time_limit_minutes'),pass_mark_percent=a.get('pass_mark_percent',50),questions=a.get('questions',[]),state='draft',owner=request.user); created['assessments']+=1
                        for pr in c.get('projects',[]):
                            project=Project.objects.create(id=pr.get('id'),course=course,title=pr['title'],brief=pr.get('brief',''),learning_outcomes=pr.get('learning_outcomes',[]),requirements=pr.get('requirements',[]),deliverables=pr.get('deliverables',[]),estimated_hours=pr.get('estimated_hours',1),state='draft',owner=request.user); created['projects']+=1
                            for r in pr.get('rubric_criteria',[]): RubricCriterion.objects.create(id=r.get('id'),project=project,title=r['title'],description=r.get('description',''),points=r.get('points',10),position=r.get('position',0))
                # Explicitly restored primary keys must advance PostgreSQL sequences.
                reset_models = [Pathway, Course, Module, Topic, Lesson, LessonVersion, Assessment, Project, RubricCriterion]
                with connection.cursor() as cursor:
                    for statement in connection.ops.sequence_reset_sql(no_style(), reset_models):
                        cursor.execute(statement)
        except (KeyError, TypeError, ValueError) as exc:
            raise ValidationError({'package': f'Invalid content structure: {exc}'})
        return Response({'created': created, 'skipped': skipped, 'status': 'imported_as_drafts',
                         'publication': 'disabled', 'checksum_verified': bool(expected)}, status=status.HTTP_201_CREATED)

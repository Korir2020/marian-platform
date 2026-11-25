from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.exceptions import MethodNotAllowed, PermissionDenied
from rest_framework.permissions import IsAuthenticated

from authoring.marian_perms import has_role
from .models import Course, Module, Pathway, Topic, EditorialState
from governance.models import StructureAuditEvent
from authoring.serializers import lesson_submission_errors
from .serializers import CourseSerializer, ModuleSerializer, PathwaySerializer, TopicSerializer


class OwnedStructureViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "position", "created_at", "updated_at"]
    ordering = ["position", "id"]

    @transaction.atomic
    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied("A content creator role is required.")
        obj = serializer.save(created_by=self.request.user)
        self._audit(obj, "created", "", obj.status, self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if has_role(user, "administrator", "curator", "reviewer"):
            return queryset
        own = queryset.filter(created_by=user)
        if True:  # published view for learners and creators
            queryset = queryset.filter(status=EditorialState.PUBLISHED)
            model = self.queryset.model
            if model is Course:
                queryset = queryset.filter(pathway__status=EditorialState.PUBLISHED)
            elif model is Module:
                queryset = queryset.filter(
                    course__status=EditorialState.PUBLISHED,
                    course__pathway__status=EditorialState.PUBLISHED,
                )
            elif model is Topic:
                queryset = queryset.filter(
                    module__status=EditorialState.PUBLISHED,
                    module__course__status=EditorialState.PUBLISHED,
                    module__course__pathway__status=EditorialState.PUBLISHED,
                )
            if has_role(user, "learner"):
                return queryset
            from django.db.models import Q
            return super().get_queryset().filter(Q(pk__in=queryset.values("pk")) | Q(pk__in=own.values("pk")))

    @transaction.atomic
    def perform_update(self, serializer):
        existing = self.get_object()
        obj = self.queryset.model.objects.select_for_update(of=("self",)).get(pk=existing.pk)
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only the owner, curator, or administrator may edit this structure.")
        if obj.status not in (EditorialState.DRAFT, EditorialState.REJECTED):
            raise ValidationError("Only draft or rejected structures can be edited; submit a new revision workflow for review.")
        serializer.instance = obj
        updated = serializer.save()
        self._audit(updated, "updated", obj.status, updated.status, self.request.user)

    @classmethod
    def _validate_course_content(cls, course):
        modules = list(course.modules.prefetch_related("topics__lessons__current_version"))
        if not course.level or not modules:
            raise ValidationError("A course needs a level and modules before submission.")
        for module in modules:
            cls._validate_topics(module.topics.all())

    @classmethod
    def _validate_topics(cls, topics):
        topics = list(topics)
        if not topics:
            raise ValidationError("A module needs topics before it can be submitted.")
        for topic in topics:
            cls._validate_topic_lessons(topic)

    @staticmethod
    def _validate_topic_lessons(topic):
        lessons = list(topic.lessons.select_related("current_version"))
        if not lessons:
            raise ValidationError("Every topic needs at least one complete lesson before submission.")
        for lesson in lessons:
            errors = lesson_submission_errors(lesson.current_version)
            if errors:
                raise ValidationError({f"lesson_{lesson.pk}": errors})

    @staticmethod
    def _audit(obj, action_name, from_state, to_state, actor):
        details = {
            field.attname: getattr(obj, field.attname)
            for field in obj._meta.fields
            if field.name not in {"created_at", "updated_at", "created_by"}
        }
        StructureAuditEvent.objects.create(
            content_type=ContentType.objects.get_for_model(obj), object_id=obj.pk, actor=actor,
            action=action_name, from_state=from_state, to_state=to_state, details=details,
        )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def submit(self, request, pk=None):
        if not request.user.is_superuser:
            raise PermissionDenied("A content creator role is required.")
        existing = self.get_object()
        obj = self.queryset.model.objects.select_for_update(of=("self",)).get(pk=existing.pk)
        if not request.user.is_superuser:
            raise PermissionDenied("Only the owner or a curator may submit this structure.")
        if obj.status not in (EditorialState.DRAFT, EditorialState.REJECTED):
            raise ValidationError("Only draft or rejected structures can be submitted.")
        if len(obj.description.strip()) < 20:
            raise ValidationError({"description": "Add a meaningful description before submitting."})
        if isinstance(obj, Pathway):
            courses = list(obj.courses.prefetch_related("modules__topics__lessons__current_version"))
            if not courses:
                raise ValidationError("A pathway cannot be submitted without at least one complete course.")
            for course in courses:
                self._validate_course_content(course)
        elif isinstance(obj, Course):
            self._validate_course_content(obj)
        elif isinstance(obj, Module):
            self._validate_topics(obj.topics.prefetch_related("lessons__current_version"))
        elif isinstance(obj, Topic):
            self._validate_topic_lessons(obj)
        previous = obj.status
        obj.status = EditorialState.SUBMITTED
        obj.save(update_fields=["status", "updated_at"])
        StructureAuditEvent.objects.create(
            content_type=ContentType.objects.get_for_model(obj),
            object_id=obj.pk,
            actor=request.user,
            action="submitted",
            from_state=previous,
            to_state=obj.status,
        )
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Content deletion is disabled until an audited archive workflow is available.")


class PathwayViewSet(OwnedStructureViewSet):
    queryset = Pathway.objects.all()
    serializer_class = PathwaySerializer


class CourseViewSet(OwnedStructureViewSet):
    queryset = Course.objects.select_related("pathway")
    serializer_class = CourseSerializer


class ModuleViewSet(OwnedStructureViewSet):
    queryset = Module.objects.select_related("course", "course__pathway")
    serializer_class = ModuleSerializer


class TopicViewSet(OwnedStructureViewSet):
    queryset = Topic.objects.select_related("module", "module__course", "module__course__pathway")
    serializer_class = TopicSerializer

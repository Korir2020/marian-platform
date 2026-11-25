import hashlib
import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from catalog.models import Pathway, Course, Module, Topic
from authoring.models import Lesson, LessonVersion

User = get_user_model()

class ContentPortabilityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='author', password='test-password', role='content_creator')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        pathway = Pathway.objects.create(title='Test pathway', slug='test-pathway', description='A sufficiently useful description for export.', created_by=self.user)
        course = Course.objects.create(pathway=pathway, title='Test course', level='beginner', created_by=self.user)
        module = Module.objects.create(course=course, title='Module', created_by=self.user)
        topic = Topic.objects.create(module=module, title='Topic', created_by=self.user)
        lesson = Lesson.objects.create(topic=topic, title='Lesson', owner=self.user)
        version = LessonVersion.objects.create(lesson=lesson, number=1, author=self.user, objectives=['Understand it'], blocks=[{'type':'explanation','content':'A meaningful explanation.'}], revision_notes='Review the main ideas and practise them.')
        lesson.current_version = version
        lesson.save(update_fields=['current_version'])
        self.pathway_id = pathway.pk

    def test_export_contains_nested_content(self):
        response = self.client.get('/api/v1/exports/marian/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['format'], 'marian-content-package')
        self.assertEqual(response.data['pathways'][0]['courses'][0]['modules'][0]['topics'][0]['lessons'][0]['versions'][0]['number'], 1)

    def test_export_includes_sha256_checksum(self):
        response = self.client.get('/api/v1/exports/marian/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['checksum']['algorithm'], 'sha256')
        self.assertEqual(len(response.data['checksum']['value']), 64)

    def test_import_dry_run_does_not_write(self):
        package = self.client.get('/api/v1/exports/marian/').data
        before = Pathway.objects.count()
        response = self.client.post('/api/v1/imports/marian/', {'package': package, 'dry_run': True, 'conflict_policy': 'skip'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'dry_run')
        self.assertEqual(Pathway.objects.count(), before)

    def test_import_rejects_tampered_checksum(self):
        package = self.client.get('/api/v1/exports/marian/').data
        package['pathways'][0]['title'] = 'Tampered title'
        response = self.client.post('/api/v1/imports/marian/', {'package': package}, format='json')
        self.assertEqual(response.status_code, 400)


    def test_import_requires_checksum(self):
        package = self.client.get('/api/v1/exports/marian/').data
        package.pop('checksum')
        response = self.client.post('/api/v1/imports/marian/', {'package': package, 'dry_run': True}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_import_rejects_duplicate_ids_inside_package(self):
        package = self.client.get('/api/v1/exports/marian/').data
        pathway = package['pathways'][0]
        course = pathway['courses'][0]
        module = course['modules'][0]
        duplicate = dict(module)
        duplicate['title'] = 'Duplicate module identity'
        course['modules'].append(duplicate)
        unsigned = {key: value for key, value in package.items() if key != 'checksum'}
        canonical = json.dumps(unsigned, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
        package['checksum'] = {'algorithm': 'sha256', 'value': hashlib.sha256(canonical).hexdigest()}
        response = self.client.post('/api/v1/imports/marian/', {'package': package, 'dry_run': True}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_import_rejects_unknown_schema(self):
        response = self.client.post('/api/v1/imports/marian/', {'package': {'format':'marian-content-package','schema_version':99,'pathways':[]}}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_learner_cannot_export(self):
        learner = User.objects.create_user(username='learner', password='test-password', role='learner')
        self.client.force_authenticate(learner)
        response = self.client.get('/api/v1/exports/marian/')
        self.assertEqual(response.status_code, 403)

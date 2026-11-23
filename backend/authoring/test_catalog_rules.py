from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from schools.models import School, TeacherProfile, SchoolAdminProfile
from catalog.models import Pathway, Course
from authoring.models import Lesson

BASE = '/api/content/v1/'


class CatalogRuleTests(APITestCase):
    def setUp(self):
        self.a = School.objects.create(name='A', code='A1')
        self.teacher = User.objects.create_user('t', password='pass12345')
        TeacherProfile.objects.create(user=self.teacher, school=self.a)
        self.admin = User.objects.create_user('ad', password='pass12345')
        SchoolAdminProfile.objects.create(user=self.admin, school=self.a)
        self.learner = User.objects.create_user('l', password='pass12345')
        self.root = User.objects.create_superuser('root', 'r@x.com', 'pass12345')
        self.pub = Pathway.objects.create(
            title='Pub', slug='pub', status='published', created_by=self.root)
        self.drf = Pathway.objects.create(
            title='Drf', slug='drf', status='draft', created_by=self.root)

    def call(self, user, method, path, data=None):
        self.client.force_authenticate(user)
        return getattr(self.client, method)(BASE + path, data, format='json')

    def ids(self, user, path):
        d = self.call(user, 'get', path).json()
        d = d['results'] if isinstance(d, dict) and 'results' in d else d
        return [r['id'] for r in d]

    # visibility
    def test_teacher_sees_published_not_others_drafts(self):
        ids = self.ids(self.teacher, 'pathways/')
        self.assertIn(self.pub.pk, ids)
        self.assertNotIn(self.drf.pk, ids)

    def test_learner_sees_published_not_drafts(self):
        ids = self.ids(self.learner, 'pathways/')
        self.assertIn(self.pub.pk, ids)
        self.assertNotIn(self.drf.pk, ids)

    def test_every_school_sees_same_published(self):
        b = School.objects.create(name='B', code='B1')
        tb = User.objects.create_user('tb', password='pass12345')
        TeacherProfile.objects.create(user=tb, school=b)
        self.assertEqual(self.ids(tb, 'pathways/'), self.ids(self.teacher, 'pathways/'))

    # writes
    def test_teacher_cannot_create_pathway(self):
        r = self.call(self.teacher, 'post', 'pathways/', {'title': 'X', 'slug': 'x'})
        self.assertEqual(r.status_code, 403)

    def test_school_admin_cannot_create_pathway(self):
        r = self.call(self.admin, 'post', 'pathways/', {'title': 'X', 'slug': 'x'})
        self.assertEqual(r.status_code, 403)

    def test_superuser_can_create_pathway(self):
        r = self.call(self.root, 'post', 'pathways/', {'title': 'X', 'slug': 'x'})
        self.assertEqual(r.status_code, 201, r.content)

    def test_school_admin_cannot_edit_pathway(self):
        r = self.call(self.admin, 'patch', f'pathways/{self.pub.pk}/', {'title': 'Hacked'})
        self.assertIn(r.status_code, (403, 404))
        self.pub.refresh_from_db()
        self.assertEqual(self.pub.title, 'Pub')

    # import / export
    def test_teacher_cannot_import(self):
        r = self.call(self.teacher, 'post', 'imports/marian/', {'package': {}, 'dry_run': True})
        self.assertEqual(r.status_code, 403)

    def test_school_admin_cannot_import(self):
        r = self.call(self.admin, 'post', 'imports/marian/', {'package': {}, 'dry_run': True})
        self.assertEqual(r.status_code, 403)

    def test_learner_cannot_export(self):
        self.assertEqual(self.call(self.learner, 'get', 'exports/marian/').status_code, 403)

    # governance
    def test_school_admin_cannot_review_structure(self):
        r = self.call(self.admin, 'post', f'structures/pathways/{self.pub.pk}/review/', {})
        self.assertIn(r.status_code, (403, 404))

    def test_school_admin_cannot_publish_structure(self):
        r = self.call(self.admin, 'post', f'structures/pathways/{self.pub.pk}/publish/', {})
        self.assertEqual(r.status_code, 403)

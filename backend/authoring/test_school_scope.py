from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from schools.models import School, SchoolAdminProfile, TeacherProfile
from catalog.models import Pathway, Course, Module, Topic
from authoring.models import Lesson

BASE = '/api/content/v1/'


def rows(resp):
    data = resp.json()
    return data['results'] if isinstance(data, dict) and 'results' in data else data


class SchoolScopeTests(APITestCase):
    def setUp(self):
        self.a = School.objects.create(name='A', code='A1')
        self.b = School.objects.create(name='B', code='B1')
        self.teacher_a = User.objects.create_user('ta', password='pass12345')
        TeacherProfile.objects.create(user=self.teacher_a, school=self.a)
        self.teacher_b = User.objects.create_user('tb', password='pass12345')
        TeacherProfile.objects.create(user=self.teacher_b, school=self.b)
        self.admin_b = User.objects.create_user('ab', password='pass12345')
        SchoolAdminProfile.objects.create(user=self.admin_b, school=self.b)
        self.learner = User.objects.create_user('learner', password='pass12345')
        self.root = User.objects.create_superuser('root', 'r@x.com', 'pass12345')

        pw = Pathway.objects.create(title='P', slug='p', status='published', created_by=self.root)
        co = Course.objects.create(pathway=pw, title='C', status='published', created_by=self.root)
        mo = Module.objects.create(course=co, title='M', status='published', created_by=self.root)
        self.topic = Topic.objects.create(module=mo, title='T', status='published', created_by=self.root)
        self.lesson_a = Lesson.objects.create(topic=self.topic, title='A lesson', owner=self.teacher_a)
        self.draft_pw = Pathway.objects.create(
            title='Draft', slug='draft', status='draft', created_by=self.teacher_a)

    def get(self, user, path):
        self.client.force_authenticate(user)
        return self.client.get(BASE + path)

    def test_owner_school_can_read(self):
        self.assertEqual(self.get(self.teacher_a, f'lessons/{self.lesson_a.pk}/').status_code, 200)

    def test_other_school_teacher_gets_404(self):
        self.assertEqual(self.get(self.teacher_b, f'lessons/{self.lesson_a.pk}/').status_code, 404)

    def test_other_school_admin_gets_404(self):
        self.assertEqual(self.get(self.admin_b, f'lessons/{self.lesson_a.pk}/').status_code, 404)

    def test_other_school_list_excludes_lesson(self):
        ids = [r['id'] for r in rows(self.get(self.admin_b, 'lessons/'))]
        self.assertNotIn(self.lesson_a.pk, ids)

    def test_other_school_cannot_submit(self):
        self.client.force_authenticate(self.teacher_b)
        r = self.client.post(BASE + f'lessons/{self.lesson_a.pk}/submit/')
        self.assertEqual(r.status_code, 404)

    def test_superuser_sees_all(self):
        self.assertEqual(self.get(self.root, f'lessons/{self.lesson_a.pk}/').status_code, 200)

    def test_learner_cannot_see_draft_lesson(self):
        self.assertEqual(self.get(self.learner, f'lessons/{self.lesson_a.pk}/').status_code, 404)

    def test_learner_cannot_write(self):
        self.client.force_authenticate(self.learner)
        r = self.client.post(BASE + 'lessons/', {'title': 'x', 'topic': self.topic.pk}, format='json')
        self.assertIn(r.status_code, (403, 404))

    def test_anonymous_gets_401(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(BASE + 'lessons/').status_code, 401)

    def test_export_hides_other_school_content_and_drafts(self):
        r = self.get(self.admin_b, 'exports/marian/')
        self.assertEqual(r.status_code, 200)
        text = r.content.decode()
        self.assertNotIn('A lesson', text)
        self.assertNotIn('Draft', text)

    def test_export_superuser_includes_everything(self):
        text = self.get(self.root, 'exports/marian/').content.decode()
        self.assertIn('A lesson', text)
        self.assertIn('Draft', text)

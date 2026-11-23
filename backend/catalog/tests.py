from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import Course, EditorialState, Pathway


User = get_user_model()


class StructurePermissionTests(APITestCase):
    def setUp(self):
        self.creator = User.objects.create_user(
            username="author", password="Test-password-123!", role=User.Role.CONTENT_CREATOR
        )
        self.learner = User.objects.create_user(
            username="student", password="Test-password-123!", role=User.Role.LEARNER
        )
        self.pathway = Pathway.objects.create(title="Pathway", slug="pathway", created_by=self.creator)
        self.course = Course.objects.create(title="Course", pathway=self.pathway, created_by=self.creator)

    def test_learner_cannot_create_structure(self):
        self.client.force_authenticate(self.learner)
        response = self.client.post("/api/v1/pathways/", {"title": "No", "slug": "no"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_creator_cannot_set_status_through_structure_serializer(self):
        self.client.force_authenticate(self.creator)
        response = self.client.post(
            "/api/v1/pathways/",
            {"title": "Unreleased", "slug": "unreleased", "status": EditorialState.PUBLISHED},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], EditorialState.DRAFT)

    def test_learner_only_sees_published_items_with_published_parents(self):
        self.client.force_authenticate(self.learner)
        self.assertEqual(self.client.get("/api/v1/pathways/").data["count"], 0)
        self.pathway.status = EditorialState.PUBLISHED
        self.pathway.save(update_fields=["status"])
        self.assertEqual(self.client.get("/api/v1/courses/").data["count"], 0)
        self.course.status = EditorialState.PUBLISHED
        self.course.save(update_fields=["status"])
        courses = self.client.get("/api/v1/courses/")
        self.assertEqual(courses.data["count"], 1)
        self.assertEqual(courses.data["results"][0]["level"], "")
        pathways = self.client.get("/api/v1/pathways/")
        self.assertEqual(pathways.data["results"][0]["course_count"], 1)
        self.assertEqual(pathways.data["results"][0]["level_count"], 0)

    def test_delete_is_blocked_until_audited_archive_exists(self):
        self.client.force_authenticate(self.creator)
        response = self.client.delete(f"/api/v1/pathways/{self.pathway.pk}/")
        self.assertEqual(response.status_code, 405)


class StructureWorkflowTests(APITestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username="author", password="Test-password-123!", role=User.Role.CONTENT_CREATOR)
        self.reviewer = User.objects.create_user(username="reviewer", password="Test-password-123!", role=User.Role.REVIEWER)
        self.curator = User.objects.create_user(username="curator", password="Test-password-123!", role=User.Role.CURATOR)
        self.pathway = Pathway.objects.create(
            title="Programming pathway", slug="programming",
            description="A substantial pathway description explaining what learners will study and build.",
            created_by=self.creator,
        )

    def test_empty_course_hierarchy_cannot_be_submitted_and_catalog_transitions_are_audited(self):
        from catalog.models import Module, Topic
        from governance.models import StructureAuditEvent, StructureReviewRecord
        self.client.force_authenticate(self.creator)
        empty = self.client.post(f"/api/v1/pathways/{self.pathway.pk}/submit/")
        self.assertEqual(empty.status_code, 400)
        created_course = self.client.post("/api/v1/courses/", {
            "title": "Beginner Software", "pathway": self.pathway.pk, "level": "beginner",
            "description": "A complete introductory course description with measurable learner outcomes.",
        }, format="json")
        self.assertEqual(created_course.status_code, 201, created_course.data)
        course = Course.objects.get(pk=created_course.data["id"])
        self.assertEqual(self.client.post(f"/api/v1/pathways/{self.pathway.pk}/submit/").status_code, 400)
        module = Module.objects.create(title="Module", course=course, created_by=self.creator)
        topic = Topic.objects.create(title="Topic", module=module, created_by=self.creator)
        self.assertEqual(self.client.post(f"/api/v1/courses/{course.pk}/submit/").status_code, 400)
        lesson_response = self.client.post("/api/v1/lessons/", {"topic": topic.pk, "title": "Complete lesson"}, format="json")
        self.assertEqual(lesson_response.status_code, 201, lesson_response.data)
        lesson_id = lesson_response.data["id"]
        version_data = {
            "objectives": ["Explain and apply the main concept."],
            "revision_notes": "Review this summary and the worked example before attempting the final question.",
            "blocks": [
                {"type": "explanation", "content": "This detailed explanation describes the concept, its use, and the reasoning behind the worked result in context."},
                {"type": "example", "content": "A worked example explains each input, transformation, and expected output."},
                {"type": "activity", "instructions": "Build a small example that applies the concept and test it with two different inputs."},
                {"type": "knowledge_check", "question": "What is the main concept?", "answer": "The concept stated above.", "explanation": "This follows from the stated rule and worked example."},
                {"type": "assessment_question", "question": "How would you adapt the example?", "answer": "Apply the same rule.", "explanation": "The rule remains valid for the changed input."},
            ],
        }
        version_response = self.client.post(f"/api/v1/lessons/{lesson_id}/versions/", version_data, format="json")
        self.assertEqual(version_response.status_code, 201, version_response.data)
        self.assertEqual(self.client.post(f"/api/v1/courses/{course.pk}/submit/").status_code, 200)
        self.assertEqual(self.client.post(f"/api/v1/pathways/{self.pathway.pk}/submit/").status_code, 200)
        self.client.force_authenticate(self.reviewer)
        review = self.client.post(
            f"/api/v1/structures/pathway/{self.pathway.pk}/review/", {"decision": "approved"}, format="json"
        )
        self.assertEqual(review.status_code, 200, review.data)
        self.client.force_authenticate(self.curator)
        with override_settings(CONTENT_PUBLISHING_ENABLED=False):
            blocked = self.client.post(f"/api/v1/structures/pathway/{self.pathway.pk}/publish/")
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(Pathway.objects.get(pk=self.pathway.pk).status, EditorialState.APPROVED)
        with override_settings(CONTENT_PUBLISHING_ENABLED=True):
            published = self.client.post(f"/api/v1/structures/pathway/{self.pathway.pk}/publish/")
        self.assertEqual(published.status_code, 200, published.data)
        self.client.force_authenticate(self.creator)
        self.assertEqual(self.client.post(f"/api/v1/courses/{course.pk}/submit/").status_code, 400)
        self.assertTrue(StructureAuditEvent.objects.filter(action="submitted", object_id=self.pathway.pk).exists())
        self.assertTrue(StructureAuditEvent.objects.filter(action="created", actor=self.creator).exists())
        self.assertEqual(StructureReviewRecord.objects.get(object_id=self.pathway.pk).decision, "approved")

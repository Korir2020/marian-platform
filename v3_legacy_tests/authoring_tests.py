from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase

from catalog.models import Course, Module, Pathway, Topic, EditorialState
from governance.models import AuditEvent
from .models import Lesson, LessonVersion

User = get_user_model()


class GovernanceApiTests(APITestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username="author", password="Test-password-123!", role="content_creator")
        self.reviewer = User.objects.create_user(username="reviewer", password="Test-password-123!", role="reviewer")
        self.curator = User.objects.create_user(username="curator", password="Test-password-123!", role="curator")
        self.learner = User.objects.create_user(username="learner", password="Test-password-123!", role="learner")
        self.pathway = Pathway.objects.create(title="Pathway", slug="pathway", created_by=self.creator)
        self.course = Course.objects.create(title="Course", pathway=self.pathway, created_by=self.creator)
        self.module = Module.objects.create(title="Module", course=self.course, created_by=self.creator)
        self.topic = Topic.objects.create(title="Topic", module=self.module, created_by=self.creator)
        self.lesson = Lesson.objects.create(topic=self.topic, title="Lesson", owner=self.creator)
        self.complete_version = {
            "objectives": ["Explain a programming concept and apply it to a practical example."],
            "revision_notes": "Review the core idea, the worked example, and the practice task before assessment.",
            "blocks": [
                {"type": "explanation", "content": "A detailed explanation that connects the idea to a concrete programming problem and carefully describes how the solution works."},
                {"type": "example", "content": "A worked example with input, expected output, and a step-by-step explanation of the result."},
                {"type": "activity", "instructions": "Write a small program that applies this concept and test it with at least two inputs."},
                {"type": "knowledge_check", "question": "What does the example demonstrate?", "answer": "It demonstrates the concept.", "explanation": "The result follows from the stated rule and the example's input."},
                {"type": "assessment_question", "question": "How would you adapt the example?", "answer": "Adapt it to the new input.", "explanation": "The same underlying rule applies after the input is changed."},
            ],
        }

    def create_version(self, data=None):
        payload = data or self.complete_version
        return self.client.post(f"/api/v1/lessons/{self.lesson.pk}/versions/", payload, format="json")

    def complete_review(self):
        self.client.force_authenticate(self.creator)
        created = self.create_version()
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(self.client.post(f"/api/v1/lessons/{self.lesson.pk}/submit/").status_code, 200)
        self.client.force_authenticate(self.reviewer)
        queue = self.client.get("/api/v1/governance/queue/")
        self.assertEqual(queue.status_code, 200)
        self.assertTrue(any(item["resource"] == "lesson" and item["id"] == self.lesson.pk for item in queue.data["results"]))
        reviewed = self.client.post(
            f"/api/v1/lessons/{self.lesson.pk}/review/", {"decision": "approved"}, format="json"
        )
        self.assertEqual(reviewed.status_code, 200, reviewed.data)
        self.client.force_authenticate(self.creator)
        history = self.client.get(f"/api/v1/lessons/{self.lesson.pk}/audit/")
        self.assertEqual(history.status_code, 200)
        self.assertTrue(any(item["action"] == "approved" for item in history.data["results"]))
        self.client.force_authenticate(self.learner)
        hidden_history = self.client.get(f"/api/v1/lessons/{self.lesson.pk}/audit/")
        self.assertEqual(hidden_history.status_code, 403)
        return reviewed

    def test_learner_cannot_create_or_submit_authoring_content(self):
        self.client.force_authenticate(self.learner)
        response = self.client.post("/api/v1/lessons/", {"topic": self.topic.pk, "title": "No"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.post(f"/api/v1/lessons/{self.lesson.pk}/submit/").status_code, 403)

    def test_incomplete_lesson_cannot_be_submitted(self):
        self.client.force_authenticate(self.creator)
        created = self.create_version({"objectives": ["Understand the concept"], "blocks": [{"type": "explanation", "content": "Short"}]})
        self.assertEqual(created.status_code, 201)
        submitted = self.client.post(f"/api/v1/lessons/{self.lesson.pk}/submit/")
        self.assertEqual(submitted.status_code, 400)
        self.assertEqual(Lesson.objects.get(pk=self.lesson.pk).state, Lesson.State.DRAFT)

    def test_role_gate_approval_snapshot_and_disabled_publish(self):
        reviewed = self.complete_review()
        lesson = Lesson.objects.get(pk=self.lesson.pk)
        self.assertEqual(lesson.approved_version_id, lesson.current_version_id)
        self.assertEqual(reviewed.data["approved_version"]["number"], 1)
        self.client.force_authenticate(self.curator)
        with override_settings(CONTENT_PUBLISHING_ENABLED=False):
            result = self.client.post(f"/api/v1/lessons/{self.lesson.pk}/publish/")
        self.assertEqual(result.status_code, 403)
        lesson.refresh_from_db()
        self.assertEqual(lesson.state, Lesson.State.APPROVED)
        self.assertIsNone(lesson.published_version_id)

    def test_creator_cannot_review_own_lesson_and_delete_is_disabled(self):
        self.client.force_authenticate(self.creator)
        self.create_version()
        self.client.post(f"/api/v1/lessons/{self.lesson.pk}/submit/")
        own_review = self.client.post(f"/api/v1/lessons/{self.lesson.pk}/review/", {"decision": "approved"}, format="json")
        self.assertEqual(own_review.status_code, 403)
        self.assertEqual(self.client.delete(f"/api/v1/lessons/{self.lesson.pk}/").status_code, 405)
        self.assertTrue(LessonVersion.objects.filter(lesson=self.lesson).exists())

    def test_released_snapshot_stays_canonical_after_revision(self):
        self.pathway.status = EditorialState.PUBLISHED
        self.course.status = EditorialState.PUBLISHED
        self.module.status = EditorialState.PUBLISHED
        self.topic.status = EditorialState.PUBLISHED
        self.pathway.save(update_fields=["status"])
        self.course.save(update_fields=["status"])
        self.module.save(update_fields=["status"])
        self.topic.save(update_fields=["status"])
        self.complete_review()
        self.client.force_authenticate(self.curator)
        with override_settings(CONTENT_PUBLISHING_ENABLED=True):
            published = self.client.post(f"/api/v1/lessons/{self.lesson.pk}/publish/")
        self.assertEqual(published.status_code, 200, published.data)
        self.client.force_authenticate(self.creator)
        revision = self.complete_version.copy()
        revision["objectives"] = ["Apply the concept in a second example."]
        self.assertEqual(self.create_version(revision).status_code, 201)
        lesson = Lesson.objects.get(pk=self.lesson.pk)
        self.assertEqual(lesson.state, Lesson.State.DRAFT)
        self.assertEqual(lesson.published_version.number, 1)
        self.client.force_authenticate(self.learner)
        response = self.client.get(f"/api/v1/lessons/{self.lesson.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["published_version"]["number"], 1)
        self.assertNotIn("current_version", response.data)
        versions = self.client.get(f"/api/v1/lessons/{self.lesson.pk}/versions/")
        self.assertEqual(len(versions.data), 1)
        self.assertEqual(versions.data[0]["number"], 1)

    def test_snapshots_are_immutable_and_revisions_increment(self):
        self.client.force_authenticate(self.creator)
        first = self.create_version()
        self.assertEqual(first.status_code, 201, first.data)
        original = LessonVersion.objects.get(pk=first.data["id"])
        revised = self.complete_version.copy()
        revised["objectives"] = ["A different learning objective."]
        second = self.create_version(revised)
        self.assertEqual(second.status_code, 201, second.data)
        original.refresh_from_db()
        self.assertEqual(original.number, 1)
        self.assertIn("Explain a programming concept", original.objectives[0])
        self.assertEqual(LessonVersion.objects.filter(lesson=self.lesson).count(), 2)
        self.assertTrue(AuditEvent.objects.filter(lesson=self.lesson, action="version_created").exists())

class AuthoringBuilderApiTests(APITestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username="builder", password="Test-password-123!", role="content_creator")
        self.learner = User.objects.create_user(username="builder-learner", password="Test-password-123!", role="learner")
        self.pathway = Pathway.objects.create(title="Builder Path", slug="builder-path", created_by=self.creator)
        self.course = Course.objects.create(title="Builder Course", pathway=self.pathway, created_by=self.creator, level="beginner")

    def test_creator_can_create_assessment_with_question_and_explanation(self):
        self.client.force_authenticate(self.creator)
        response = self.client.post("/api/v1/assessments/", {
            "title": "Module quiz", "description": "A short module quiz", "course": self.course.pk,
            "kind": "quiz", "instructions": "Answer every question.", "pass_mark_percent": 60,
            "questions": [{"type": "multiple_choice", "prompt": "Which is a valid value?", "points": 2,
                           "options": ["true", "maybe"], "correct_option": "true", "explanation": "true is a Boolean literal."}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["state"], "draft")

    def test_invalid_assessment_question_is_rejected(self):
        self.client.force_authenticate(self.creator)
        response = self.client.post("/api/v1/assessments/", {
            "title": "Broken quiz", "description": "A short quiz", "course": self.course.pk,
            "kind": "quiz", "pass_mark_percent": 50,
            "questions": [{"type": "multiple_choice", "prompt": "Choose", "points": 1,
                           "options": ["A", "B"], "correct_option": "C", "explanation": "Not valid."}],
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_creator_can_create_project_with_marking_rubric_and_learner_cannot(self):
        self.client.force_authenticate(self.creator)
        payload = {"title": "Portfolio project", "course": self.course.pk,
                   "brief": "Build a responsive portfolio website that demonstrates your skills.",
                   "learning_outcomes": ["Build a responsive interface"], "requirements": ["Use semantic HTML"],
                   "deliverables": ["Source code", "README"], "estimated_hours": 8,
                   "rubric_criteria": [{"title": "Functionality", "description": "Works as specified", "points": 60, "position": 0},
                                       {"title": "Quality", "description": "Readable code", "points": 40, "position": 1}]}
        response = self.client.post("/api/v1/projects/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(sum(row["points"] for row in response.data["rubric_criteria"]), 100)
        self.client.force_authenticate(self.learner)
        self.assertEqual(self.client.get("/api/v1/projects/").data["results"], [])

class AssessmentProjectGovernanceApiTests(APITestCase):
    def setUp(self):
        from authoring.models import Assessment, Project, RubricCriterion
        self.creator = User.objects.create_user(username="assessment-author", password="Test-password-123!", role="content_creator")
        self.reviewer = User.objects.create_user(username="assessment-reviewer", password="Test-password-123!", role="reviewer")
        self.pathway = Pathway.objects.create(title="Assessment Path", slug="assessment-path", created_by=self.creator)
        self.course = Course.objects.create(title="Assessment Course", pathway=self.pathway, created_by=self.creator, level="beginner")
        self.assessment = Assessment.objects.create(title="Course quiz", course=self.course, owner=self.creator,
            questions=[{"type": "multiple_choice", "prompt": "Which is correct?", "points": 1,
                        "options": ["A", "B"], "correct_option": "A", "explanation": "A is correct."}])
        self.project = Project.objects.create(title="Course project", course=self.course, owner=self.creator,
            brief="Build a small application that demonstrates the course learning outcomes.",
            learning_outcomes=["Apply the course concepts"], requirements=["Document the solution"], deliverables=["Source code"])
        RubricCriterion.objects.create(project=self.project, title="Correctness", points=100)

    def test_assessment_and_project_submit_and_review_workflows(self):
        from governance.models import StructureAuditEvent, StructureReviewRecord
        self.client.force_authenticate(self.creator)
        for resource, obj in (("assessments", self.assessment), ("projects", self.project)):
            response = self.client.post(f"/api/v1/{resource}/{obj.pk}/submit/")
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data["state"], "submitted")
        self.client.force_authenticate(self.reviewer)
        queue = self.client.get("/api/v1/governance/queue/")
        self.assertTrue(any(row["resource"] == "assessment" and row["id"] == self.assessment.pk for row in queue.data["results"]))
        for resource, obj in (("assessment", self.assessment), ("project", self.project)):
            response = self.client.post(f"/api/v1/authoring/{resource}/{obj.pk}/review/",
                                        {"decision": "approved", "comment": "Reviewed."}, format="json")
            self.assertEqual(response.status_code, 200, response.content[:400])
        self.assertEqual(StructureReviewRecord.objects.count(), 2)
        self.assertEqual(StructureAuditEvent.objects.filter(action="approved").count(), 2)

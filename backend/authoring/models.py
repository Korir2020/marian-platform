from django.conf import settings
from django.db import models

from catalog.models import Topic


class Lesson(models.Model):
    class State(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PUBLISHED = "published", "Published"

    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="lessons")
    state = models.CharField(max_length=12, choices=State.choices, default=State.DRAFT, db_index=True)
    current_version = models.ForeignKey(
        "LessonVersion", null=True, blank=True, on_delete=models.PROTECT, related_name="current_for"
    )
    approved_version = models.ForeignKey(
        "LessonVersion", null=True, blank=True, on_delete=models.PROTECT, related_name="approved_for"
    )
    published_version = models.ForeignKey(
        "LessonVersion", null=True, blank=True, on_delete=models.PROTECT, related_name="published_for"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]


class LessonVersion(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="versions")
    number = models.PositiveIntegerField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="lesson_versions")
    objectives = models.JSONField(default=list)
    blocks = models.JSONField(default=list)
    revision_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-number"]
        constraints = [models.UniqueConstraint(fields=["lesson", "number"], name="unique_lesson_version_number")]

class Assessment(models.Model):
    class Kind(models.TextChoices):
        QUIZ = "quiz", "Quiz"
        MODULE = "module", "Module assessment"
        FINAL = "final", "Final assessment"
        PRACTICAL = "practical", "Practical assessment"
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    course = models.ForeignKey("catalog.Course", on_delete=models.CASCADE, related_name="assessments")
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.QUIZ)
    instructions = models.TextField(blank=True)
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    pass_mark_percent = models.PositiveSmallIntegerField(default=50)
    questions = models.JSONField(default=list)
    state = models.CharField(max_length=12, choices=Lesson.State.choices, default=Lesson.State.DRAFT, db_index=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="studio_assessments")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-updated_at"]
        constraints = [models.CheckConstraint(condition=models.Q(pass_mark_percent__lte=100), name="assessment_pass_mark_lte_100")]

    def clean(self):
        from django.core.exceptions import ValidationError
        if not isinstance(self.questions, list):
            raise ValidationError({"questions": "Questions must be a list."})
        for i, question in enumerate(self.questions):
            if not isinstance(question, dict) or not question.get("prompt"):
                raise ValidationError({"questions": f"Question {i + 1} needs a prompt."})
            if question.get("type", "short_answer") == "multiple_choice":
                options = question.get("options", [])
                if len(options) < 2 or question.get("correct_option") not in options:
                    raise ValidationError({"questions": f"Question {i + 1} needs options and a valid correct option."})


class Project(models.Model):
    class State(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PUBLISHED = "published", "Published"
    title = models.CharField(max_length=200)
    course = models.ForeignKey("catalog.Course", on_delete=models.CASCADE, related_name="projects")
    brief = models.TextField()
    learning_outcomes = models.JSONField(default=list)
    requirements = models.JSONField(default=list)
    deliverables = models.JSONField(default=list)
    estimated_hours = models.PositiveIntegerField(default=1)
    state = models.CharField(max_length=12, choices=State.choices, default=State.DRAFT, db_index=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="studio_projects")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-updated_at"]


class RubricCriterion(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="rubric_criteria")
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    points = models.PositiveIntegerField(default=10)
    position = models.PositiveIntegerField(default=0)
    class Meta:
        ordering = ["position", "id"]

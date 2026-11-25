from django.conf import settings
from django.db import models

class EditorialState(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    PUBLISHED = "published", "Published"

class OrderedContent(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="%(class)s_created")
    status = models.CharField(max_length=12, choices=EditorialState.choices, default=EditorialState.DRAFT, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True
        ordering = ["position", "id"]

class Pathway(OrderedContent):
    slug = models.SlugField(unique=True)
    class Meta(OrderedContent.Meta):
        constraints = [models.UniqueConstraint(fields=["title"], name="unique_pathway_title")]

class Course(OrderedContent):
    class Level(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    pathway = models.ForeignKey(Pathway, on_delete=models.CASCADE, related_name="courses")
    level = models.CharField(max_length=16, choices=Level.choices, blank=True, default="")
    class Meta(OrderedContent.Meta):
        constraints = [models.UniqueConstraint(fields=["pathway", "title"], name="unique_course_title_per_pathway")]

class Module(OrderedContent):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")

class Topic(OrderedContent):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="topics")

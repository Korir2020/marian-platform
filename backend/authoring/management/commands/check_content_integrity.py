"""Check persisted Studio content relationships without modifying records."""
from django.core.management.base import BaseCommand, CommandError

from authoring.models import Assessment, Lesson, Project
from catalog.models import Course, Module, Pathway, Topic, EditorialState


class Command(BaseCommand):
    help = "Check content relationships, version pointers and assessment/project data without writing."

    def handle(self, *args, **options):
        errors = []
        counts = {
            "pathways": Pathway.objects.count(), "courses": Course.objects.count(),
            "modules": Module.objects.count(), "topics": Topic.objects.count(),
            "lessons": Lesson.objects.count(), "assessments": Assessment.objects.count(),
            "projects": Project.objects.count(),
        }
        for lesson in Lesson.objects.select_related("current_version", "approved_version", "published_version").iterator():
            for field in ("current_version", "approved_version", "published_version"):
                version = getattr(lesson, field)
                if version and version.lesson_id != lesson.id:
                    errors.append(f"Lesson {lesson.pk}: {field} points to version {version.pk} owned by another lesson.")
            if lesson.state == Lesson.State.PUBLISHED and not lesson.published_version_id:
                errors.append(f"Lesson {lesson.pk}: published without a published version.")
            if lesson.state == Lesson.State.APPROVED and not lesson.approved_version_id:
                errors.append(f"Lesson {lesson.pk}: approved without an approved version.")
        for assessment in Assessment.objects.iterator():
            try:
                assessment.clean()
            except Exception as exc:
                errors.append(f"Assessment {assessment.pk}: {exc}")
        for project in Project.objects.iterator():
            if not project.rubric_criteria.exists():
                errors.append(f"Project {project.pk}: no rubric criteria are defined.")
        for pathway in Pathway.objects.filter(status=EditorialState.PUBLISHED).iterator():
            if not pathway.courses.filter(status=EditorialState.PUBLISHED).exists():
                errors.append(f"Pathway {pathway.pk}: published without a published course.")
        self.stdout.write("Content record counts:")
        for name, count in counts.items():
            self.stdout.write(f"  {name}: {count}")
        if errors:
            for error in errors:
                self.stderr.write(self.style.ERROR(f"- {error}"))
            raise CommandError(f"Content integrity check failed with {len(errors)} issue(s). No records were changed.")
        self.stdout.write(self.style.SUCCESS("Content integrity check passed. No records were changed."))

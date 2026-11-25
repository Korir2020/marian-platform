"""Load JavaScript Programming — Intermediate as draft content only."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[5]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from authoring.models import Lesson, LessonVersion
from catalog.models import Course, EditorialState, Module, Pathway, Topic
from curriculum.validator import learner_blocks_for_lesson, validate_manifest

MANIFEST_PATH = PROJECT_ROOT / "curriculum" / "javascript_programming_intermediate.json"
ALLOWED_ROLES = {"content_creator", "curator", "administrator"}


def _course_description(manifest: dict) -> str:
    course = manifest["course"]
    outcomes = "\n".join(f"- {item}" for item in course["learning_outcomes"])
    return (
        f"{course['short_description']}\n\n"
        f"Prerequisites: {course['prerequisites']}\n"
        f"Language: {course['programming_language']} ({course['minimum_runtime_version']}).\n"
        f"Estimated guided study: {course['estimated_guided_hours']} hours.\n"
        f"Learning outcomes:\n{outcomes}"
    )


def _check_owned_draft(obj, owner, expected: dict, label: str) -> None:
    if obj.created_by_id != owner.id:
        raise CommandError(f"{label} is owned by another account; nothing was changed.")
    if obj.status != EditorialState.DRAFT:
        raise CommandError(f"{label} is not draft content; nothing was changed.")
    for field, value in expected.items():
        if getattr(obj, field) != value:
            raise CommandError(f"{label} conflicts on {field}; nothing was changed.")


def _get_or_create(model, filters: dict, fields: dict, owner, label: str, created: list[str]):
    matches = list(model.objects.filter(**filters))
    if len(matches) > 1:
        raise CommandError(f"Multiple {label} records match; nothing was changed.")
    if matches:
        _check_owned_draft(matches[0], owner, fields, label)
        return matches[0]
    obj = model.objects.create(**fields, created_by=owner, status=EditorialState.DRAFT)
    created.append(label)
    return obj


def _assert_no_extra_children(queryset, expected_titles: set[str], label: str) -> None:
    actual = [child.title for child in queryset]
    if len(actual) != len(set(actual)):
        raise CommandError(f"Duplicate {label} titles exist; nothing was changed.")
    extras = sorted(set(actual) - expected_titles)
    if extras:
        raise CommandError(f"Unexpected existing {label} items {extras}; refusing to overwrite or omit them.")


def _ensure_lesson_version(manifest: dict, lesson: Lesson, spec: dict, author, digest: str, allow_new_revision: bool):
    if lesson.owner_id != author.id:
        raise CommandError(f"Lesson '{lesson.title}' belongs to another author; nothing was changed.")
    if lesson.state != Lesson.State.DRAFT:
        raise CommandError(f"Lesson '{lesson.title}' is not draft; nothing was changed.")
    objectives = spec["objectives"]
    blocks = learner_blocks_for_lesson(manifest, spec)
    current = lesson.current_version
    if current and current.objectives == objectives and current.blocks == blocks:
        return False, True
    if current and not allow_new_revision:
        raise CommandError(f"Lesson '{lesson.title}' has different content; use --new-revision to append a draft version.")
    number = (lesson.versions.order_by("-number").values_list("number", flat=True).first() or 0) + 1
    version = LessonVersion.objects.create(
        lesson=lesson, number=number, author=author, objectives=objectives, blocks=blocks,
        revision_notes=f"Seeded from javascript-programming-intermediate manifest v1; sha256={digest}. Draft only.",
    )
    lesson.current_version = version
    lesson.save(update_fields=["current_version", "updated_at"])
    return True, False


def load_course(manifest: dict, author, allow_new_revision: bool = False) -> dict[str, int]:
    """Create or verify the Intermediate course without changing sibling levels."""
    digest = hashlib.sha256(json.dumps(manifest, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
    created: list[str] = []
    versions_created = versions_unchanged = 0

    pathway_spec = manifest["pathway"]
    hits = list(Pathway.objects.filter(Q(slug=pathway_spec["slug"]) | Q(title=pathway_spec["title"])))
    if len(hits) > 1:
        raise CommandError("Pathway title and slug refer to different records; nothing was changed.")
    if hits:
        pathway = hits[0]
        _check_owned_draft(pathway, author, {"title": pathway_spec["title"], "slug": pathway_spec["slug"]}, "JavaScript Programming pathway")
    else:
        pathway = Pathway.objects.create(
            title=pathway_spec["title"], slug=pathway_spec["slug"], description=pathway_spec["description"],
            position=0, created_by=author, status=EditorialState.DRAFT,
        )
        created.append("JavaScript Programming pathway")

    course_spec = manifest["course"]
    course_fields = {
        "title": course_spec["title"], "pathway": pathway,
        "description": _course_description(manifest), "position": 2, "level": "intermediate",
    }
    course = _get_or_create(Course, {"pathway": pathway, "title": course_spec["title"]}, course_fields, author, "JavaScript Programming — Intermediate course", created)
    _assert_no_extra_children(course.modules.all(), {item["title"] for item in manifest["modules"]}, "module")

    for module_spec in manifest["modules"]:
        module_fields = {"course": course, "title": module_spec["title"], "description": module_spec["description"], "position": module_spec["position"]}
        module = _get_or_create(Module, {"course": course, "title": module_spec["title"]}, module_fields, author, f"module '{module_spec['title']}'", created)
        _assert_no_extra_children(module.topics.all(), {item["title"] for item in module_spec["topics"]}, f"topic in '{module.title}'")
        for topic_spec in module_spec["topics"]:
            topic_fields = {"module": module, "title": topic_spec["title"], "description": topic_spec["description"], "position": topic_spec["position"]}
            topic = _get_or_create(Topic, {"module": module, "title": topic_spec["title"]}, topic_fields, author, f"topic '{topic_spec['title']}'", created)
            lesson_spec = topic_spec["lesson"]
            _assert_no_extra_children(topic.lessons.all(), {lesson_spec["title"]}, f"lesson in '{topic.title}'")
            lessons = list(Lesson.objects.filter(topic=topic, title=lesson_spec["title"]))
            if len(lessons) > 1:
                raise CommandError(f"Multiple lessons titled '{lesson_spec['title']}' exist; nothing was changed.")
            if lessons:
                lesson_obj = lessons[0]
            else:
                lesson_obj = Lesson.objects.create(topic=topic, title=lesson_spec["title"], owner=author, state=Lesson.State.DRAFT)
                created.append(f"lesson '{lesson_spec['title']}'")
            changed, unchanged = _ensure_lesson_version(manifest, lesson_obj, lesson_spec, author, digest, allow_new_revision)
            versions_created += int(changed)
            versions_unchanged += int(unchanged)

    return {"structures_created": len(created), "versions_created": versions_created, "versions_unchanged": versions_unchanged}


class Command(BaseCommand):
    help = "Validate or load JavaScript Programming — Intermediate as draft content only."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Write validated draft records; otherwise no database access occurs.")
        parser.add_argument("--username", help="Existing account with content_creator, curator, or administrator role (required with --apply).")
        parser.add_argument("--new-revision", action="store_true", help="Append immutable draft lesson versions without replacing prior versions.")

    def handle(self, *args, **options):
        try:
            manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(f"Cannot read course manifest: {exc}") from exc
        errors = validate_manifest(manifest)
        if errors:
            raise CommandError("Course manifest is invalid:\n- " + "\n- ".join(errors))
        if manifest["provenance"]["content_status"] != "draft":
            raise CommandError("Only an explicitly draft manifest may be loaded.")

        if not options["apply"]:
            if options["username"] or options["new_revision"]:
                raise CommandError("--username and --new-revision require --apply; dry-run makes no database connection or write.")
            self.stdout.write(self.style.SUCCESS("Manifest valid: JavaScript Programming — Intermediate, 4 modules, 12 topics, 12 lessons."))
            self.stdout.write("Dry run only: no database was queried or changed. Publishing remains disabled.")
            return

        username = options["username"]
        if not username:
            raise CommandError("--username is required with --apply.")
        User = get_user_model()
        try:
            author = User.objects.get(username=username)
        except User.DoesNotExist as exc:
            raise CommandError(f"No account named '{username}' exists.") from exc
        if getattr(author, "role", None) not in ALLOWED_ROLES:
            raise CommandError("The selected account must already have content_creator, curator, or administrator role.")
        try:
            with transaction.atomic():
                counts = load_course(manifest, author, allow_new_revision=options["new_revision"])
        except CommandError:
            raise
        self.stdout.write(self.style.SUCCESS(
            f"Draft course load complete: {counts['structures_created']} structures/lessons created, "
            f"{counts['versions_created']} versions created, {counts['versions_unchanged']} identical versions unchanged."
        ))
        self.stdout.write("No review, submission, approval, publication, or publishing-gate change was performed.")

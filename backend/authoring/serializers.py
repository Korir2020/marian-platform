from rest_framework import serializers

from .models import Lesson, LessonVersion


LESSON_BLOCK_TYPES = {
    "explanation", "example", "diagram", "activity", "knowledge_check", "assessment_question", "code"
}


class LessonVersionCreateSerializer(serializers.Serializer):
    objectives = serializers.ListField(
        child=serializers.CharField(max_length=300, allow_blank=False), min_length=1, max_length=20
    )
    blocks = serializers.ListField(child=serializers.DictField(), min_length=1, max_length=100)
    revision_notes = serializers.CharField(required=False, allow_blank=True, default="", max_length=5000)

    def validate_blocks(self, blocks):
        for index, block in enumerate(blocks):
            kind = block.get("type")
            if not isinstance(kind, str) or kind not in LESSON_BLOCK_TYPES:
                raise serializers.ValidationError(
                    f"Block {index + 1} must use a supported type: {', '.join(sorted(LESSON_BLOCK_TYPES))}."
                )
        return blocks


class LessonVersionSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source="author.username")

    class Meta:
        model = LessonVersion
        fields = ["id", "lesson", "number", "author_name", "objectives", "blocks", "revision_notes", "created_at"]
        read_only_fields = fields


class LessonSerializer(serializers.ModelSerializer):
    current_version = LessonVersionSerializer(read_only=True)
    approved_version = LessonVersionSerializer(read_only=True)
    published_version = LessonVersionSerializer(read_only=True)
    owner_name = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Lesson
        fields = [
            "id", "topic", "title", "owner_name", "state", "current_version", "approved_version",
            "published_version", "created_at", "updated_at",
        ]
        read_only_fields = [
            "owner_name", "state", "current_version", "approved_version", "published_version", "created_at", "updated_at",
        ]


class LearnerLessonSerializer(serializers.ModelSerializer):
    published_version = LessonVersionSerializer(read_only=True)

    class Meta:
        model = Lesson
        fields = ["id", "topic", "title", "published_version"]
        read_only_fields = fields


def lesson_submission_errors(version):
    """Return completeness errors for the official lesson requirements before submission."""
    errors = {}
    if not version or not version.objectives:
        errors["objectives"] = "At least one learning objective is required."
    if not version or len(version.revision_notes.strip()) < 20:
        errors["revision_notes"] = "Revision notes must include meaningful learner revision material (at least 20 characters)."
    blocks = version.blocks if version else []
    by_type = {}
    for block in blocks:
        by_type.setdefault(block.get("type"), []).append(block)
    required = {
        "explanation": "content",
        "example": "content",
        "activity": "instructions",
        "knowledge_check": "question",
        "assessment_question": "question",
    }
    for kind, field in required.items():
        matches = by_type.get(kind, [])
        if not matches:
            errors[kind] = f"At least one {kind.replace('_', ' ')} block is required."
            continue
        if not any(isinstance(item.get(field), str) and len(item[field].strip()) >= 20 for item in matches):
            errors[kind] = f"The {kind.replace('_', ' ')} block needs substantive {field} content."
    for kind in ("knowledge_check", "assessment_question"):
        matches = by_type.get(kind, [])
        if matches and not any(
            all(isinstance(item.get(key), str) and item[key].strip() for key in ("question", "answer", "explanation"))
            for item in matches
        ):
            errors[kind] = "Questions require an answer and explanatory feedback."
    if by_type.get("diagram") and not any(
        isinstance(item.get("alt_text"), str) and item["alt_text"].strip() for item in by_type["diagram"]
    ):
        errors["diagram"] = "Diagrams require meaningful alt_text."
    return errors

from .models import Assessment, Project, RubricCriterion

class AssessmentSerializer(serializers.ModelSerializer):
    owner_name = serializers.ReadOnlyField(source="owner.username")
    class Meta:
        model = Assessment
        fields = "__all__"
        read_only_fields = ("owner", "state", "created_at", "updated_at")
    def validate(self, attrs):
        questions = attrs.get("questions", getattr(self.instance, "questions", []))
        if not isinstance(questions, list) or not questions:
            raise serializers.ValidationError({"questions": "Add at least one assessment question."})
        for index, question in enumerate(questions):
            if not isinstance(question, dict) or not str(question.get("prompt", "")).strip():
                raise serializers.ValidationError({"questions": f"Question {index + 1} needs a prompt."})
            if question.get("type") == "multiple_choice":
                options = [str(x).strip() for x in question.get("options", []) if str(x).strip()]
                if len(options) < 2 or question.get("correct_option") not in options:
                    raise serializers.ValidationError({"questions": f"Question {index + 1} needs at least two options and a valid correct answer."})
            if int(question.get("points", 0)) < 1:
                raise serializers.ValidationError({"questions": f"Question {index + 1} must be worth at least one point."})
        return attrs

class RubricCriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricCriterion
        fields = ["id", "title", "description", "points", "position"]

class ProjectSerializer(serializers.ModelSerializer):
    rubric_criteria = RubricCriterionSerializer(many=True, required=False)
    owner_name = serializers.ReadOnlyField(source="owner.username")
    class Meta:
        model = Project
        fields = ["id", "title", "course", "brief", "learning_outcomes", "requirements", "deliverables", "estimated_hours", "state", "owner", "owner_name", "rubric_criteria", "created_at", "updated_at"]
        read_only_fields = ("owner", "state", "created_at", "updated_at")
    def validate(self, attrs):
        criteria = attrs.get("rubric_criteria", [])
        if not criteria:
            raise serializers.ValidationError({"rubric_criteria": "Add at least one marking criterion."})
        if any(int(item.get("points", 0)) < 1 for item in criteria):
            raise serializers.ValidationError({"rubric_criteria": "Each criterion must have at least one point."})
        return attrs
    def create(self, validated_data):
        criteria = validated_data.pop("rubric_criteria", [])
        project = Project.objects.create(**validated_data)
        for index, criterion in enumerate(criteria):
            criterion = {k: v for k, v in criterion.items() if k != 'position'}
            RubricCriterion.objects.create(project=project, position=index, **criterion)
        return project
    def update(self, instance, validated_data):
        criteria = validated_data.pop("rubric_criteria", None)
        for key, value in validated_data.items(): setattr(instance, key, value)
        instance.save()
        if criteria is not None:
            instance.rubric_criteria.all().delete()
            for index, criterion in enumerate(criteria):
                RubricCriterion.objects.create(project=instance, position=index, **criterion)
        return instance

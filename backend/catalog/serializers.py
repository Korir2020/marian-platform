from rest_framework import serializers

from .models import Course, Module, Pathway, Topic


class StructureSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source="created_by.username")
    status = serializers.ReadOnlyField()

    class Meta:
        fields = "__all__"


class PathwaySerializer(StructureSerializer):
    course_count = serializers.SerializerMethodField()
    level_count = serializers.SerializerMethodField()

    class Meta(StructureSerializer.Meta):
        model = Pathway
        fields = "__all__"

    def get_course_count(self, obj) -> int:
        return obj.courses.count()

    def get_level_count(self, obj) -> int:
        return obj.courses.exclude(level="").values("level").distinct().count()


class CourseSerializer(StructureSerializer):
    class Meta(StructureSerializer.Meta):
        model = Course


class ModuleSerializer(StructureSerializer):
    class Meta(StructureSerializer.Meta):
        model = Module


class TopicSerializer(StructureSerializer):
    class Meta(StructureSerializer.Meta):
        model = Topic

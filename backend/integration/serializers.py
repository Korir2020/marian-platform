import re

from rest_framework import serializers


class ImportPackageSerializer(serializers.Serializer):
    package = serializers.DictField()
    conflict_policy = serializers.ChoiceField(choices=['reject', 'skip'], default='reject')
    dry_run = serializers.BooleanField(default=False)

    def validate_package(self, value):
        if value.get('format') != 'marian-content-package' or value.get('schema_version') != 1:
            raise serializers.ValidationError('Unsupported content package format or schema version.')
        if not isinstance(value.get('pathways'), list):
            raise serializers.ValidationError('Package must contain a pathways list.')
        checksum = value.get('checksum')
        if not isinstance(checksum, dict) or checksum.get('algorithm') != 'sha256' or not isinstance(checksum.get('value'), str) or not re.fullmatch(r'[0-9a-f]{64}', checksum.get('value', '')):
            raise serializers.ValidationError('A valid SHA-256 checksum is required for every imported package.')
        # Reject duplicate IDs within a package before any database work. IDs are
        # unique per model namespace, not globally across different model types.
        seen_ids = {name: set() for name in ('pathway', 'course', 'module', 'topic', 'lesson', 'lesson_version', 'assessment', 'project', 'rubric_criterion')}
        def register(kind, row):
            object_id = row.get('id')
            if object_id is None:
                return
            if not isinstance(object_id, int) or isinstance(object_id, bool) or object_id < 1:
                raise serializers.ValidationError(f'{kind} IDs must be positive integers.')
            if object_id in seen_ids[kind]:
                raise serializers.ValidationError(f'Duplicate {kind} ID {object_id} inside package.')
            seen_ids[kind].add(object_id)
        for index, pathway in enumerate(value['pathways']):
            if not isinstance(pathway, dict) or not pathway.get('title') or not pathway.get('slug'):
                raise serializers.ValidationError(f'Pathway {index + 1} requires a title and slug.')
            register('pathway', pathway)
            if not isinstance(pathway.get('courses', []), list):
                raise serializers.ValidationError('Pathway courses must be a list.')
            for course in pathway.get('courses', []):
                if not isinstance(course, dict) or not course.get('title'):
                    raise serializers.ValidationError(f'Every course in pathway {index + 1} requires a title.')
                register('course', course)
                if not isinstance(course.get('modules', []), list) or not isinstance(course.get('assessments', []), list) or not isinstance(course.get('projects', []), list):
                    raise serializers.ValidationError('Course modules, assessments and projects must be lists.')
                for assessment in course.get('assessments', []):
                    if not isinstance(assessment, dict) or not assessment.get('title') or not isinstance(assessment.get('questions', []), list):
                        raise serializers.ValidationError('Assessments require a title and a questions list.')
                    register('assessment', assessment)
                    if not 0 <= assessment.get('pass_mark_percent', 50) <= 100:
                        raise serializers.ValidationError('Assessment pass_mark_percent must be between 0 and 100.')
                for project in course.get('projects', []):
                    if not isinstance(project, dict) or not project.get('title') or not isinstance(project.get('rubric_criteria', []), list):
                        raise serializers.ValidationError('Projects require a title and rubric_criteria list.')
                    register('project', project)
                    for criterion in project.get('rubric_criteria', []):
                        if not isinstance(criterion, dict) or not criterion.get('title') or criterion.get('points', 10) < 1:
                            raise serializers.ValidationError('Each rubric criterion requires a title and positive points.')
                        register('rubric_criterion', criterion)
                for module in course.get('modules', []):
                    if not isinstance(module, dict) or not module.get('title'):
                        raise serializers.ValidationError('Every module requires a title.')
                    register('module', module)
                    if not isinstance(module.get('topics', []), list):
                        raise serializers.ValidationError('Module topics must be a list.')
                    for topic in module.get('topics', []):
                        if not isinstance(topic, dict) or not topic.get('title'):
                            raise serializers.ValidationError('Every topic requires a title.')
                        register('topic', topic)
                        if not isinstance(topic.get('lessons', []), list):
                            raise serializers.ValidationError('Topic lessons must be a list.')
                        for lesson in topic.get('lessons', []):
                            if not isinstance(lesson, dict) or not lesson.get('title'):
                                raise serializers.ValidationError('Every lesson requires a title.')
                            register('lesson', lesson)
                            if not isinstance(lesson.get('versions', []), list):
                                raise serializers.ValidationError('Lesson versions must be a list.')
                            numbers = [item.get('number') for item in lesson.get('versions', []) if isinstance(item, dict)]
                            if len(numbers) != len(lesson.get('versions', [])):
                                raise serializers.ValidationError('Every lesson version must be an object.')
                            if any(not isinstance(number, int) or number < 1 for number in numbers) or len(numbers) != len(set(numbers)):
                                raise serializers.ValidationError('Lesson version numbers must be unique positive integers.')
                            for version in lesson.get('versions', []):
                                register('lesson_version', version)
        return value

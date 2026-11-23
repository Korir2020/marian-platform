from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from authoring.marian_perms import has_role, scope_to_school
from catalog.models import EditorialState
from governance.models import AuditEvent
from .models import Lesson, LessonVersion
from .serializers import (
    LearnerLessonSerializer,
    LessonSerializer,
    LessonVersionCreateSerializer,
    LessonVersionSerializer,
    lesson_submission_errors,
)


class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title"]
    ordering_fields = ["title", "created_at", "updated_at"]
    ordering = ["id"]
    queryset = Lesson.objects.select_related(
        "owner", "current_version", "approved_version", "published_version", "topic",
        "topic__module", "topic__module__course", "topic__module__course__pathway",
    )

    def get_serializer_class(self):
        if not self.request.user.is_superuser and has_role(self.request.user, "learner"):
            return LearnerLessonSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = scope_to_school(queryset, self.request.user)
        user = self.request.user
        if has_role(user, "reviewer", "curator", "administrator"):
            return queryset
        if has_role(user, "learner"):
            return queryset.filter(
                published_version__isnull=False,
                topic__status=EditorialState.PUBLISHED,
                topic__module__status=EditorialState.PUBLISHED,
                topic__module__course__status=EditorialState.PUBLISHED,
                topic__module__course__pathway__status=EditorialState.PUBLISHED,
            )
        return queryset.filter(owner=user)

    def perform_create(self, serializer):
        if not has_role(self.request.user, "content_creator", "curator", "administrator"):
            raise PermissionDenied("A content creator role is required.")
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        lesson = self.get_object()
        if lesson.owner_id != self.request.user.id and not has_role(self.request.user, "curator", "administrator"):
            raise PermissionDenied("Only the owner, curator, or administrator may edit this lesson.")
        if lesson.state not in (Lesson.State.DRAFT, Lesson.State.REJECTED):
            raise ValidationError("Only draft or rejected lessons are editable; create a new version after returning to draft.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Lesson deletion is disabled; use a future audited archive workflow.")

    @extend_schema(responses={200: inline_serializer(
        name="LessonAuditResponse",
        fields={"results": serializers.ListField(child=inline_serializer(
            name="LessonAuditItem",
            fields={"id": serializers.IntegerField(), "actor": serializers.CharField(allow_null=True),
                    "action": serializers.CharField(), "from_state": serializers.CharField(),
                    "to_state": serializers.CharField(), "details": serializers.JSONField(),
                    "created_at": serializers.DateTimeField()},
        ))},
    )})
    @action(detail=True, methods=["get"], url_path="audit")
    def audit_log(self, request, pk=None):
        if has_role(request.user, "learner") and not request.user.is_superuser:
            raise PermissionDenied("Learners cannot access internal governance history.")
        lesson = self.get_object()
        rows = AuditEvent.objects.filter(lesson=lesson).select_related("actor").order_by("created_at", "id")
        return Response({"results": [
            {"id": row.id, "actor": row.actor.username if row.actor else None, "action": row.action,
             "from_state": row.from_state, "to_state": row.to_state, "details": row.details,
             "created_at": row.created_at}
            for row in rows
        ]})

    @action(detail=True, methods=["get", "post"], url_path="versions")
    def versions(self, request, pk=None):
        lesson = self.get_object()
        if request.method == "GET":
            if has_role(request.user, "learner"):
                versions = [lesson.published_version] if lesson.published_version_id else []
            else:
                versions = lesson.versions.select_related("author").all()
            return Response(LessonVersionSerializer(versions, many=True).data)
        if lesson.owner_id != request.user.id and not has_role(request.user, "curator", "administrator"):
            raise PermissionDenied("Only the owner, curator, or administrator may create a revision.")
        if lesson.state not in (Lesson.State.DRAFT, Lesson.State.REJECTED, Lesson.State.APPROVED, Lesson.State.PUBLISHED):
            raise ValidationError("Cannot revise a submitted lesson.")
        serializer = LessonVersionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            locked = Lesson.objects.select_for_update(of=("self",)).get(pk=lesson.pk)
            number = (locked.versions.order_by("-number").values_list("number", flat=True).first() or 0) + 1
            version = LessonVersion.objects.create(
                lesson=locked, number=number, author=request.user, **serializer.validated_data
            )
            previous = locked.state
            locked.current_version = version
            locked.state = Lesson.State.DRAFT
            locked.save(update_fields=["current_version", "state", "updated_at"])
            AuditEvent.objects.create(
                lesson=locked, actor=request.user, action="version_created", from_state=previous,
                to_state=locked.state, details={"version": number},
            )
        return Response(LessonVersionSerializer(version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        with transaction.atomic():
            lesson = get_object_or_404(Lesson.objects.filter(pk__in=scope_to_school(Lesson.objects.all(), request.user).values("pk")).select_for_update(of=("self",)).select_related("current_version"), pk=pk)
            if not has_role(request.user, "content_creator", "curator", "administrator"):
                raise PermissionDenied("A content creator role is required.")
            if lesson.owner_id != request.user.id and not has_role(request.user, "curator", "administrator"):
                raise PermissionDenied("Only the owner or a curator may submit this lesson.")
            if lesson.state not in (Lesson.State.DRAFT, Lesson.State.REJECTED) or lesson.current_version_id is None:
                raise ValidationError("A draft with a version is required for submission.")
            errors = lesson_submission_errors(lesson.current_version)
            if errors:
                raise ValidationError({"content": errors})
            return self._transition(lesson, Lesson.State.SUBMITTED, "submitted", request.user)

    def _transition(self, lesson, new_state, action_name, actor):
        old_state = lesson.state
        lesson.state = new_state
        lesson.save(update_fields=["state", "updated_at"])
        AuditEvent.objects.create(
            lesson=lesson, actor=actor, action=action_name, from_state=old_state, to_state=new_state
        )
        return Response(LessonSerializer(lesson, context={"request": self.request}).data)

from .models import Assessment, Project
from .serializers import AssessmentSerializer, ProjectSerializer

class OwnedAuthoringViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "created_at", "updated_at"]
    ordering = ["-updated_at"]

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from governance.models import StructureAuditEvent
        from django.contrib.contenttypes.models import ContentType
        if not has_role(request.user, "content_creator", "curator", "administrator"):
            raise PermissionDenied("A content creator role is required.")
        obj = self.get_object()
        if obj.owner_id != request.user.id and not has_role(request.user, "curator", "administrator"):
            raise PermissionDenied("Only the owner or a curator may submit this item.")
        if obj.state not in ("draft", "rejected"):
            raise ValidationError("Only draft or rejected items can be submitted.")
        if isinstance(obj, Assessment):
            try:
                obj.full_clean()
            except DjangoValidationError as exc:
                raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
            if not obj.questions:
                raise ValidationError({"questions": "Add at least one question before submission."})
        else:
            if len(obj.brief.strip()) < 30 or not obj.learning_outcomes or not obj.deliverables or not obj.rubric_criteria.exists():
                raise ValidationError("A project needs a substantive brief, learning outcomes, deliverables and rubric criteria.")
        previous = obj.state
        obj.state = "submitted"
        obj.save(update_fields=["state", "updated_at"])
        StructureAuditEvent.objects.create(content_type=ContentType.objects.get_for_model(obj), object_id=obj.pk,
            actor=request.user, action="submitted", from_state=previous, to_state=obj.state)
        return Response(self.get_serializer(obj).data)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "created_at", "updated_at"]
    ordering = ["-updated_at"]
    def get_queryset(self):
        qs = super().get_queryset()
        qs = scope_to_school(qs, self.request.user)
        if has_role(self.request.user, "reviewer", "curator", "administrator"):
            return qs
        if has_role(self.request.user, "learner"):
            return qs.filter(state="published")
        return qs.filter(owner=self.request.user)
    def perform_create(self, serializer):
        if not has_role(self.request.user, "content_creator", "curator", "administrator"):
            raise PermissionDenied("A content creator role is required.")
        serializer.save(owner=self.request.user)
    def perform_update(self, serializer):
        obj = self.get_object()
        if obj.owner_id != self.request.user.id and not has_role(self.request.user, "curator", "administrator"):
            raise PermissionDenied("Only the owner, curator, or administrator may edit this item.")
        if obj.state not in ("draft", "rejected"):
            raise ValidationError("Only draft or rejected items can be edited.")
        serializer.save()
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Deletion is disabled; use an audited archive workflow.")

class AssessmentViewSet(OwnedAuthoringViewSet):
    queryset = Assessment.objects.select_related("course", "owner")
    serializer_class = AssessmentSerializer
    def perform_create(self, serializer):
        if not has_role(self.request.user, "content_creator", "curator", "administrator"):
            raise PermissionDenied("A content creator role is required.")
        serializer.save(owner=self.request.user)

class ProjectViewSet(OwnedAuthoringViewSet):
    queryset = Project.objects.select_related("course", "owner").prefetch_related("rubric_criteria")
    serializer_class = ProjectSerializer
    def perform_create(self, serializer):
        if not has_role(self.request.user, "content_creator", "curator", "administrator"):
            raise PermissionDenied("A content creator role is required.")
        serializer.save(owner=self.request.user)

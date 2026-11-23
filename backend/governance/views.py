from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from authoring.marian_perms import has_role, scope_to_school
from authoring.models import Assessment, Lesson, Project
from authoring.serializers import LessonSerializer
from catalog.models import Course, EditorialState, Module, Pathway, Topic
from .models import AuditEvent, ReviewRecord, StructureAuditEvent, StructureReviewRecord


class ReviewDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=("approved", "rejected"))
    comment = serializers.CharField(required=False, allow_blank=True, default="", max_length=5000)


structure_response = inline_serializer(
    name="StructureWorkflowResponse",
    fields={"resource": serializers.CharField(), "id": serializers.IntegerField(), "title": serializers.CharField(), "status": serializers.CharField()},
)


def structure_model(resource):
    models_by_name = {"pathway": Pathway, "course": Course, "module": Module, "topic": Topic}
    model = models_by_name.get(resource)
    if model is None:
        raise ValidationError({"resource": "Unsupported structure type."})
    return model


def structure_snapshot(obj):
    result = {"id": obj.pk, "title": obj.title, "description": obj.description, "position": obj.position}
    if isinstance(obj, Pathway):
        result["slug"] = obj.slug
    elif isinstance(obj, Course):
        result.update({"pathway_id": obj.pathway_id, "level": obj.level})
    elif isinstance(obj, Module):
        result["course_id"] = obj.course_id
    elif isinstance(obj, Topic):
        result["module_id"] = obj.module_id
    return result


def structure_parent_is_published(obj):
    if isinstance(obj, Pathway):
        return True
    if isinstance(obj, Course):
        return obj.pathway.status == EditorialState.PUBLISHED
    if isinstance(obj, Module):
        return obj.course.status == EditorialState.PUBLISHED and obj.course.pathway.status == EditorialState.PUBLISHED
    if isinstance(obj, Topic):
        return (
            obj.module.status == EditorialState.PUBLISHED
            and obj.module.course.status == EditorialState.PUBLISHED
            and obj.module.course.pathway.status == EditorialState.PUBLISHED
        )
    return False


def structure_payload(obj, resource):
    return {"resource": resource, "id": obj.pk, "title": obj.title, "status": obj.status}


@extend_schema(request=ReviewDecisionSerializer, responses={200: structure_response})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def review_structure(request, resource, pk):
    if not request.user.is_superuser:
        raise PermissionDenied("Only platform administrators may review or publish shared catalog items.")
    model = structure_model(resource)
    with transaction.atomic():
        obj = get_object_or_404(model.objects.filter(pk__in=scope_to_school(model.objects.all(), request.user, owner="created_by").values("pk")).select_for_update(of=("self",)).select_related("created_by"), pk=pk)
        if obj.created_by_id == request.user.id:
            raise PermissionDenied("Authors cannot review their own content.")
        if obj.status != EditorialState.SUBMITTED:
            raise ValidationError("Only submitted structures can be reviewed.")
        decision_serializer = ReviewDecisionSerializer(data=request.data)
        decision_serializer.is_valid(raise_exception=True)
        decision = decision_serializer.validated_data["decision"]
        previous = obj.status
        obj.status = EditorialState.APPROVED if decision == "approved" else EditorialState.REJECTED
        obj.save(update_fields=["status", "updated_at"])
        content_type = ContentType.objects.get_for_model(model)
        snapshot = structure_snapshot(obj)
        StructureReviewRecord.objects.create(
            content_type=content_type, object_id=obj.pk, version_snapshot=snapshot, reviewer=request.user,
            decision=decision, comment=decision_serializer.validated_data["comment"],
        )
        StructureAuditEvent.objects.create(
            content_type=content_type, object_id=obj.pk, actor=request.user, action=decision,
            from_state=previous, to_state=obj.status, details={"snapshot": snapshot},
        )
    return Response(structure_payload(obj, resource))


@extend_schema(request=None, responses={200: structure_response})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def publish_structure(request, resource, pk):
    if not settings.CONTENT_PUBLISHING_ENABLED:
        return Response({"detail": "Platform publishing is disabled."}, status=status.HTTP_403_FORBIDDEN)
    if not request.user.is_superuser:
        raise PermissionDenied("Only platform administrators may review or publish shared catalog items.")
    model = structure_model(resource)
    with transaction.atomic():
        queryset = model.objects.filter(pk__in=scope_to_school(model.objects.all(), request.user, owner="created_by").values("pk")).select_for_update(of=("self",))
        if model is Course:
            queryset = queryset.select_related("pathway")
        elif model is Module:
            queryset = queryset.select_related("course", "course__pathway")
        elif model is Topic:
            queryset = queryset.select_related("module", "module__course", "module__course__pathway")
        obj = get_object_or_404(queryset, pk=pk)
        if obj.status != EditorialState.APPROVED:
            raise ValidationError("Only approved structures can be published.")
        if not structure_parent_is_published(obj):
            raise ValidationError("Publish this structure's parent first.")
        previous = obj.status
        obj.status = EditorialState.PUBLISHED
        obj.save(update_fields=["status", "updated_at"])
        StructureAuditEvent.objects.create(
            content_type=ContentType.objects.get_for_model(model), object_id=obj.pk, actor=request.user,
            action="published", from_state=previous, to_state=obj.status, details={"snapshot": structure_snapshot(obj)},
        )
    return Response(structure_payload(obj, resource))


queue_item = inline_serializer(
    name="GovernanceQueueItem",
    fields={
        "resource": serializers.CharField(),
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "owner": serializers.CharField(),
        "status": serializers.CharField(),
        "submitted_at": serializers.DateTimeField(),
    },
)


@extend_schema(responses={200: inline_serializer(
    name="GovernanceQueuePage",
    fields={"count": serializers.IntegerField(), "next": serializers.URLField(allow_null=True),
            "previous": serializers.URLField(allow_null=True), "results": serializers.ListField(child=queue_item)},
)})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def review_queue(request):
    if not has_role(request.user, "reviewer", "curator", "administrator"):
        raise PermissionDenied("Reviewer role required.")
    items = []
    for lesson in scope_to_school(Lesson.objects.filter(state=Lesson.State.SUBMITTED), request.user).select_related("owner"):
        items.append({"resource": "lesson", "id": lesson.pk, "title": lesson.title,
                      "owner": lesson.owner.username, "status": lesson.state, "submitted_at": lesson.updated_at})
    for resource, model in (("pathway", Pathway), ("course", Course), ("module", Module), ("topic", Topic)):
        for obj in scope_to_school(model.objects.filter(status=EditorialState.SUBMITTED), request.user, owner="created_by").select_related("created_by"):
            items.append({"resource": resource, "id": obj.pk, "title": obj.title,
                          "owner": obj.created_by.username, "status": obj.status, "submitted_at": obj.updated_at})
    for resource, model in (("assessment", Assessment), ("project", Project)):
        for obj in scope_to_school(model.objects.filter(state="submitted"), request.user).select_related("owner"):
            items.append({"resource": resource, "id": obj.pk, "title": obj.title,
                          "owner": obj.owner.username, "status": obj.state, "submitted_at": obj.updated_at})
    items.sort(key=lambda item: (item["submitted_at"], item["resource"], item["id"]), reverse=True)
    paginator = PageNumberPagination()
    paginator.page_size = 25
    page = paginator.paginate_queryset(items, request, view=None)
    return paginator.get_paginated_response(page)


@extend_schema(request=ReviewDecisionSerializer, responses={200: LessonSerializer})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def review(request, pk):
    if not has_role(request.user, "reviewer", "curator", "administrator"):
        raise PermissionDenied("Reviewer role required.")
    with transaction.atomic():
        lesson = Lesson.objects.filter(pk__in=scope_to_school(Lesson.objects.all(), request.user, owner="owner").values("pk")).select_for_update(of=("self",)).select_related("current_version", "owner").get(pk=pk)
        if lesson.owner_id == request.user.id:
            raise PermissionDenied("Authors cannot review their own lessons.")
        if lesson.state != Lesson.State.SUBMITTED or not lesson.current_version_id:
            raise ValidationError("Only submitted lessons with a current version can be reviewed.")
        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = serializer.validated_data["decision"]
        comment = serializer.validated_data["comment"]
        previous_state = lesson.state
        lesson.state = Lesson.State.APPROVED if decision == "approved" else Lesson.State.REJECTED
        update_fields = ["state", "updated_at"]
        if decision == "approved":
            lesson.approved_version = lesson.current_version
            update_fields.append("approved_version")
        lesson.save(update_fields=update_fields)
        ReviewRecord.objects.create(
            lesson=lesson, version=lesson.current_version, reviewer=request.user, decision=decision, comment=comment
        )
        AuditEvent.objects.create(
            lesson=lesson, actor=request.user, action=decision, from_state=previous_state,
            to_state=lesson.state, details={"comment": comment, "version": lesson.current_version.number},
        )
    return Response(LessonSerializer(lesson, context={"request": request}).data)


@extend_schema(request=None, responses={200: LessonSerializer})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def publish(request, pk):
    if not settings.CONTENT_PUBLISHING_ENABLED:
        return Response({"detail": "Platform publishing is disabled."}, status=status.HTTP_403_FORBIDDEN)
    if not has_role(request.user, "curator", "administrator"):
        raise PermissionDenied("Curator or administrator role required.")
    with transaction.atomic():
        lesson = Lesson.objects.filter(pk__in=scope_to_school(Lesson.objects.all(), request.user, owner="owner").values("pk")).select_for_update(of=("self",)).select_related(
            "approved_version", "owner", "topic__module__course__pathway"
        ).get(pk=pk)
        if lesson.state != Lesson.State.APPROVED or not lesson.approved_version_id:
            raise ValidationError("Only an approved lesson version can be published.")
        if lesson.approved_version_id != lesson.current_version_id:
            raise ValidationError("The approved version is no longer current; submit the latest revision for review.")
        if not structure_parent_is_published(lesson.topic):
            raise ValidationError("Publish the topic, module, course, and pathway before publishing this lesson.")
        previous_state = lesson.state
        lesson.state = Lesson.State.PUBLISHED
        lesson.published_version = lesson.approved_version
        lesson.save(update_fields=["state", "published_version", "updated_at"])
        AuditEvent.objects.create(
            lesson=lesson, actor=request.user, action="published", from_state=previous_state,
            to_state=lesson.state, details={"version": lesson.published_version.number},
        )
    return Response(LessonSerializer(lesson, context={"request": request}).data)


def authoring_model(resource):
    model = {"assessment": Assessment, "project": Project}.get(resource)
    if model is None:
        raise ValidationError({"resource": "Unsupported authoring resource."})
    return model


@extend_schema(request=ReviewDecisionSerializer, responses={200: structure_response})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def review_authoring_item(request, resource, pk):
    if not has_role(request.user, "reviewer", "curator", "administrator"):
        raise PermissionDenied("Reviewer role required.")
    model = authoring_model(resource)
    with transaction.atomic():
        obj = get_object_or_404(model.objects.filter(pk__in=scope_to_school(model.objects.all(), request.user, owner="owner").values("pk")).select_for_update(of=("self",)).select_related("owner"), pk=pk)
        if obj.owner_id == request.user.id:
            raise PermissionDenied("Authors cannot review their own content.")
        if obj.state != "submitted":
            raise ValidationError("Only submitted content can be reviewed.")
        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = serializer.validated_data["decision"]
        previous = obj.state
        obj.state = decision
        obj.save(update_fields=["state", "updated_at"])
        content_type = ContentType.objects.get_for_model(model)
        snapshot = {"id": obj.pk, "title": obj.title, "course_id": obj.course_id}
        StructureReviewRecord.objects.create(content_type=content_type, object_id=obj.pk,
            version_snapshot=snapshot, reviewer=request.user, decision=decision,
            comment=serializer.validated_data["comment"])
        StructureAuditEvent.objects.create(content_type=content_type, object_id=obj.pk, actor=request.user,
            action=decision, from_state=previous, to_state=obj.state, details={"snapshot": snapshot})
    return Response({"resource": resource, "id": obj.pk, "title": obj.title, "status": obj.state})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def publish_authoring_item(request, resource, pk):
    if not settings.CONTENT_PUBLISHING_ENABLED:
        return Response({"detail": "Platform publishing is disabled."}, status=status.HTTP_403_FORBIDDEN)
    if not has_role(request.user, "curator", "administrator"):
        raise PermissionDenied("Curator or administrator role required.")
    model = authoring_model(resource)
    with transaction.atomic():
        obj = get_object_or_404(model.objects.filter(pk__in=scope_to_school(model.objects.all(), request.user, owner="owner").values("pk")).select_for_update(of=("self",)).select_related("course"), pk=pk)
        if obj.state != "approved":
            raise ValidationError("Only approved content can be published.")
        if obj.course.status != EditorialState.PUBLISHED:
            raise ValidationError("Publish the parent course before publishing this item.")
        previous = obj.state
        obj.state = "published"
        obj.save(update_fields=["state", "updated_at"])
        content_type = ContentType.objects.get_for_model(model)
        StructureAuditEvent.objects.create(content_type=content_type, object_id=obj.pk, actor=request.user,
            action="published", from_state=previous, to_state=obj.state)
    return Response({"resource": resource, "id": obj.pk, "title": obj.title, "status": obj.state})

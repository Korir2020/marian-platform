"""Adapter: V3 has_role() backed by Marian's profile tables."""
from schools.models import SchoolAdminProfile, TeacherProfile

# V3 role -> Marian kinds that hold it. Edit here only.
ROLE_MAP = {
    "administrator": {"superuser", "school_admin"},
    "curator": {"superuser", "school_admin"},
    "reviewer": {"superuser", "school_admin"},
    "content_creator": {"superuser", "teacher"},
    "learner": {"other"},
}


def user_kind(user):
    if not user or not getattr(user, "is_authenticated", False):
        return None
    cached = getattr(user, "_content_kind", None)
    if cached:
        return cached
    if user.is_superuser:
        kind = "superuser"
    elif SchoolAdminProfile.objects.filter(user=user).exists():
        kind = "school_admin"
    elif TeacherProfile.objects.filter(user=user).exists():
        kind = "teacher"
    else:
        kind = "other"
    user._content_kind = kind
    return kind


def has_role(user, *roles):
    kind = user_kind(user)
    if kind is None:
        return False
    return any(kind in ROLE_MAP.get(r, ()) for r in roles)


def scope_to_school(qs, user, owner="owner"):
    """Limit qs to rows whose owner belongs to the user's school.
    Superuser: all. No school (learner, other, anonymous): none."""
    from django.db.models import Q
    from api.permissions import get_user_school_id
    kind = user_kind(user)
    if kind == "superuser":
        return qs
    if kind == "other":
        # Learners: no school link. Views limit them to published content.
        # TODO: replace with payment gating.
        return qs
    sid = get_user_school_id(user) if kind in ("school_admin", "teacher") else None
    if sid is None:
        return qs.none()
    return qs.filter(
        Q(**{owner + "__school_admin_profile__school_id": sid})
        | Q(**{owner + "__teacher_profile__school_id": sid})
    )

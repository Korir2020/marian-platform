from django.urls import path
from .views import publish, publish_authoring_item, publish_structure, review, review_authoring_item, review_queue, review_structure

urlpatterns = [
    path("governance/queue/", review_queue),
    path("lessons/<int:pk>/review/", review),
    path("lessons/<int:pk>/publish/", publish),
    path("structures/<str:resource>/<int:pk>/review/", review_structure),
    path("structures/<str:resource>/<int:pk>/publish/", publish_structure),
    path("authoring/<str:resource>/<int:pk>/review/", review_authoring_item),
    path("authoring/<str:resource>/<int:pk>/publish/", publish_authoring_item),
]

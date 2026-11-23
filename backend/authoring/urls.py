from rest_framework.routers import DefaultRouter
from .views import AssessmentViewSet, LessonViewSet, ProjectViewSet
router=DefaultRouter()
router.register("lessons", LessonViewSet)
router.register("assessments", AssessmentViewSet)
router.register("projects", ProjectViewSet)
urlpatterns=router.urls

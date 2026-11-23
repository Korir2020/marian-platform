from rest_framework.routers import SimpleRouter
from .views import AssessmentViewSet, LessonViewSet, ProjectViewSet
router=SimpleRouter()
router.register("lessons", LessonViewSet)
router.register("assessments", AssessmentViewSet)
router.register("projects", ProjectViewSet)
urlpatterns=router.urls

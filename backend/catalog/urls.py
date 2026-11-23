from rest_framework.routers import DefaultRouter
from .views import PathwayViewSet, CourseViewSet, ModuleViewSet, TopicViewSet
router=DefaultRouter()
router.register("pathways", PathwayViewSet); router.register("courses", CourseViewSet); router.register("modules", ModuleViewSet); router.register("topics", TopicViewSet)
urlpatterns=router.urls

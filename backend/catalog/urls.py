from rest_framework.routers import SimpleRouter
from .views import PathwayViewSet, CourseViewSet, ModuleViewSet, TopicViewSet
router=SimpleRouter()
router.register("pathways", PathwayViewSet); router.register("courses", CourseViewSet); router.register("modules", ModuleViewSet); router.register("topics", TopicViewSet)
urlpatterns=router.urls

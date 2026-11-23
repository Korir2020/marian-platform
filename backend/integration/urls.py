from django.urls import path
from .views import ContentExportView, ContentImportView

urlpatterns = [
    path('exports/marian/', ContentExportView.as_view(), name='marian-content-export'),
    path('imports/marian/', ContentImportView.as_view(), name='marian-content-import'),
]

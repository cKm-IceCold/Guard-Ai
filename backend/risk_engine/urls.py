from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RiskProfileViewSet, MT5SyncView

router = DefaultRouter()
router.register(r'risk-profile', RiskProfileViewSet, basename='risk_profile')

urlpatterns = [
    path('', include(router.urls)),
    path('mt5-sync/', MT5SyncView.as_view(), name='mt5_sync'),
]


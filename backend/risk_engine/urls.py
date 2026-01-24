from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RiskProfileViewSet

router = DefaultRouter()
router.register(r'risk-profile', RiskProfileViewSet, basename='risk_profile')

urlpatterns = [
    path('', include(router.urls)),
]

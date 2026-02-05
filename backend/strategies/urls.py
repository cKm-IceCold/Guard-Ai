from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StrategyViewSet, CustomRuleViewSet

router = DefaultRouter()
router.register(r'strategies', StrategyViewSet, basename='strategy')
router.register(r'custom-rules', CustomRuleViewSet, basename='custom-rule')

urlpatterns = [
    path('', include(router.urls)),
]

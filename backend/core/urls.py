from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .broker_views import BrokerConnectionViewSet
from .public_views import PublicProfileViewSet
from .views import get_prices

router = DefaultRouter()
router.register(r'broker-connections', BrokerConnectionViewSet, basename='broker-connection')
router.register(r'public/u', PublicProfileViewSet, basename='public-profile')

urlpatterns = [
    path('prices/', get_prices, name='get_prices'),
    path('', include(router.urls)),
]

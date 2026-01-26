from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .broker_views import BrokerConnectionViewSet
from .views import get_prices

router = DefaultRouter()
router.register(r'broker-connections', BrokerConnectionViewSet, basename='broker-connection')

urlpatterns = [
    path('prices/', get_prices, name='get_prices'),
    path('', include(router.urls)),
]

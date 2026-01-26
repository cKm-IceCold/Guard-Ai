from rest_framework import generics, permissions
from .serializers import UserSerializer
from .models import User
import requests
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def get_prices(request):
    """Proxy Binance prices to avoid CORS issues on frontend."""
    try:
        symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
        resp = requests.get('https://api.binance.com/api/v3/ticker/24hr', timeout=5)
        data = resp.json()
        filtered = [item for item in data if item['symbol'] in symbols]
        return JsonResponse(filtered, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

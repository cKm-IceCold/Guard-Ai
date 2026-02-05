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
    """
    Fetches real-time market data for Crypto (via CCXT) and Forex (via Yahoo Finance).
    Returns a normalized list of tickers.
    """
    import yfinance as yf
    
    data = []

    # Combined Price Feed (Exclusively Yahoo Finance)
    try:
        # Map Yahoo symbols to Display names (Crypto + Forex)
        market_map = {
            'BTC-USD': 'BTC',
            'ETH-USD': 'ETH',
            'SOL-USD': 'SOL',
            'EURUSD=X': 'EUR/USD',
            'GBPUSD=X': 'GBP/USD',
            'USDJPY=X': 'USD/JPY',
            'GC=F': 'GOLD',
            '^GSPC': 'S&P 500'
        }
        
        # Optimized batch fetch for all symbols
        tickers = yf.Tickers(" ".join(market_map.keys()))
        
        for yf_symbol, display_name in market_map.items():
            try:
                # Fetch 2d history to calculate price and % change
                hist = tickers.tickers[yf_symbol].history(period="2d")
                
                if not hist.empty:
                    current = float(hist['Close'].iloc[-1].item())
                    
                    # Calculate change from previous close
                    if len(hist) > 1:
                        prev = float(hist['Close'].iloc[-2].item())
                        change = ((current - prev) / prev) * 100
                    else:
                        change = 0.0
                        
                    decimals = 2 if any(x in display_name for x in ["JPY", "S&P", "GOLD", "BTC", "ETH", "SOL"]) else 4
                    
                    data.append({
                        'symbol': display_name,
                        'lastPrice': f"{current:.{decimals}f}",
                        'priceChangePercent': f"{change:.2f}"
                    })
            except Exception as inner_e:
                print(f"DEBUG: Failed to fetch {yf_symbol}: {inner_e}")
                continue
                
    except Exception as e:
        print(f"CRITICAL Yahoo Price Feed Error: {e}")

    return JsonResponse(data, safe=False)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

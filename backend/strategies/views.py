from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
import requests
import json
from .models import Strategy, CustomRule
from .serializers import StrategySerializer, CustomRuleSerializer
from .services import GeminiService

class StrategyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing trading strategies.
    Provides standard CRUD operations and a custom 'backtest' action.
    Supports file uploads for strategy chart screenshots.
    """
    serializer_class = StrategySerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        """Returns strategies belonging only to the authenticated user."""
        return Strategy.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Associates the new strategy with the authenticated user."""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='backtest')
    def backtest(self, request, pk=None):
        """
        Custom action to perform an AI-driven backtest of a strategy.
        1. Fetches historical price data (Yahoo Finance).
        2. Uses Gemini to extract quantitative rules from the strategy description.
        3. Uses Gemini to simulate performance over the historical dataset.
        """
        strategy = self.get_object()
        
        # 1. Fetch historical data (BTC-USD)
        history = self._get_full_2yr_history()
        if not history:
            return Response({"error": "Failed to fetch market history from Yahoo Finance"}, status=503)

        # 2. Convert natural language description into machine-readable logic via AI
        gemini = GeminiService()
        logic_json = gemini.extract_strategy_logic(strategy.description)
        
        # 3. Process the backtest results using AI quantitative analysis (Pro with Flash fallback)
        history_meta = f"""
        DATASET OVERVIEW (2 MONTHS BTC/USDT 1D):
        - Start Price: ${float(history[0][4])}
        - End Price: ${float(history[-1][4])}
        """
        
        result_str = gemini.run_backtest(
            strategy_description=strategy.description,
            history_meta=history_meta,
            snapshots=history,
            logic_json=logic_json
        )
            
        return Response(json.loads(result_str))

    def _get_full_2yr_history(self):
        """
        Fetches 60 days of historical data using Yahoo Finance.
        Exclusively uses yfinance for stability during the hackathon.
        """
        import yfinance as yf
        from datetime import datetime
        
        try:
            print("DEBUG: Fetching historical data via Yahoo Finance...")
            # yfinance uses 'BTC-USD'
            data = yf.download("BTC-USD", period="60d", interval="1d", progress=False)
            
            if not data.empty:
                normalized = []
                for index, row in data.iterrows():
                    # Ensure scalar values using .item() to avoid 'Series' errors
                    normalized.append([
                        int(index.timestamp() * 1000),
                        float(row['Open'].item() if hasattr(row['Open'], 'item') else row['Open']),
                        float(row['High'].item() if hasattr(row['High'], 'item') else row['High']),
                        float(row['Low'].item() if hasattr(row['Low'], 'item') else row['Low']),
                        float(row['Close'].item() if hasattr(row['Close'], 'item') else row['Close']),
                        float(row['Volume'].item() if hasattr(row['Volume'], 'item') else row['Volume'])
                    ])
                return normalized
        except Exception as e:
            print(f"CRITICAL: Yahoo Finance Fetch Failed: {e}")
            
        return None

class CustomRuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual visual rules (Protocols).
    Linked to a specific Strategy. Supports image uploads for rule patterns.
    """
    serializer_class = CustomRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        """Returns custom rules belonging only to the authenticated user."""
        return CustomRule.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Associates the rule with the authenticated user."""
        serializer.save(user=self.request.user)


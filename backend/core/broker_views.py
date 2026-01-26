from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import BrokerConnection
from .broker_service import get_adapter
from rest_framework import serializers


class BrokerConnectionSerializer(serializers.ModelSerializer):
    """
    Serializer for BrokerConnection. 
    Handles encryption of API credentials during creation and update.
    """
    # API credentials are write-only to ensure they are never leaked in GET requests.
    api_key = serializers.CharField(write_only=True, required=False)
    api_secret = serializers.CharField(write_only=True, required=False)
    
    # Computed indicator of whether the connection is currently configured.
    is_connected = serializers.SerializerMethodField()
    
    class Meta:
        model = BrokerConnection
        fields = [
            'id', 'broker_type', 'nickname', 'api_key', 'api_secret',
            'mt_server', 'mt_login', 'is_active', 'last_synced_at', 
            'created_at', 'is_connected'
        ]
        read_only_fields = ['id', 'last_synced_at', 'created_at', 'is_connected']
    
    def get_is_connected(self, obj):
        """Returns True if the connection has been initialized with credentials."""
        return obj.is_active and bool(obj._api_key)
    
    def create(self, validated_data):
        """Encrypts credentials during the creation of a new connection."""
        api_key = validated_data.pop('api_key', '')
        api_secret = validated_data.pop('api_secret', '')
        
        instance = BrokerConnection(**validated_data)
        instance.user = self.context['request'].user
        instance.api_key = api_key
        instance.api_secret = api_secret
        instance.save()
        return instance
    
    def update(self, instance, validated_data):
        """Updates connection fields and re-encrypts credentials if provided."""
        api_key = validated_data.pop('api_key', None)
        api_secret = validated_data.pop('api_secret', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if api_key:
            instance.api_key = api_key
        if api_secret:
            instance.api_secret = api_secret
        
        instance.save()
        return instance


from journal.models import Trade
from django.utils import timezone

class BrokerConnectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user-specific Broker Connections.
    Supports synchronization of trades, connection testing, and financial data retrieval.
    """
    serializer_class = BrokerConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Ensures users can only access their own connections."""
        return BrokerConnection.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'], url_path='sync')
    def sync_trades(self, request, pk=None):
        """
        Fetches closed trades from the broker and imports them as Journal entries.
        Uses a unique external_id to prevent duplicate imports.
        """
        connection = self.get_object()
        
        try:
            adapter = get_adapter(connection)
            # Fetch trades since last sync, or last 7 days for new connections.
            since = connection.last_synced_at or (timezone.now() - timezone.timedelta(days=7))
            
            # For Crypto (CCXT), we usually fetch specific major symbols. 
            # In production, this would iterate over the user's active symbols.
            symbols = ['BTC/USDT', 'ETH/USDT'] if connection.broker_type != 'METATRADER' else [None]
            
            synced_count = 0
            for symbol in symbols:
                broker_trades = adapter.get_trade_history(since=since, symbol=symbol)
                
                for bt in broker_trades:
                    # Construct a unique ID to identify this specific trade across systems.
                    ext_id = bt.get('id') or f"{connection.broker_type}_{bt.get('ticket') or bt.get('timestamp')}"
                    
                    if not Trade.objects.filter(user=request.user, external_id=ext_id).exists():
                        Trade.objects.create(
                            user=request.user,
                            external_id=ext_id,
                            symbol=bt.get('symbol', symbol),
                            side=bt.get('side', '').upper(),
                            pnl=bt.get('profit') or bt.get('pnl') or 0,
                            status='CLOSED',
                            result='WIN' if (bt.get('profit') or 0) > 0 else 'LOSS' if (bt.get('profit') or 0) < 0 else 'BREAKEVEN',
                            notes=f"Auto-synced from {connection.broker_type}",
                            followed_plan=False  # Auto-synced trades require manual review for discipline.
                        )
                        synced_count += 1
            
            # Update sync timestamp to avoid pulling old trades next time.
            connection.last_synced_at = timezone.now()
            connection.save()
            
            return Response({
                'status': 'success',
                'synced_count': synced_count,
                'message': f'Successfully synced {synced_count} new trades.'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='test')
    def test_connection(self, request, pk=None):
        """Verification endpoint: Performs a live handshake to confirm API keys are valid."""
        connection = self.get_object()
        
        try:
            adapter = get_adapter(connection)
            adapter.connect()  # Triggers credentials check
            balance = adapter.get_balance()
            
            return Response({
                'status': 'success',
                'message': 'Connection successful!',
                'balance': balance
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], url_path='balance')
    def get_balance(self, request, pk=None):
        """Fetches real-time account balance from the broker."""
        connection = self.get_object()
        
        try:
            adapter = get_adapter(connection)
            balance = adapter.get_balance()
            return Response(balance)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    @action(detail=True, methods=['get'], url_path='positions')
    def get_positions(self, request, pk=None):
        """Fetches active market positions."""
        connection = self.get_object()
        
        try:
            adapter = get_adapter(connection)
            positions = adapter.get_positions()
            return Response(positions)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    @action(detail=True, methods=['get'], url_path='trades')
    def get_trades(self, request, pk=None):
        """Fetches recent trade history for display (RAW data)."""
        connection = self.get_object()
        symbol = request.query_params.get('symbol', 'BTC/USDT')
        
        try:
            adapter = get_adapter(connection)
            trades = adapter.get_trade_history(symbol=symbol)
            return Response(trades)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

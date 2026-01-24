from rest_framework import serializers
from .models import Trade
from django.db.models import Count, Sum, Avg, Q

class TradeSerializer(serializers.ModelSerializer):
    strategy_name = serializers.CharField(source='strategy.name', read_only=True)
    
    class Meta:
        model = Trade
        fields = ['id', 'strategy', 'strategy_name', 'status', 'result', 'pnl', 'notes', 'followed_plan', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TradeStatsSerializer(serializers.Serializer):
    """Aggregated stats for a user's trades, optionally filtered by strategy."""
    total_trades = serializers.IntegerField()
    wins = serializers.IntegerField()
    losses = serializers.IntegerField()
    win_rate = serializers.FloatField()
    total_pnl = serializers.DecimalField(max_digits=12, decimal_places=2)
    avg_win = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    avg_loss = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    discipline_rate = serializers.FloatField()  # % of trades where plan was followed

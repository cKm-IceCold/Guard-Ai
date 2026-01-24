from rest_framework import serializers
from .models import RiskProfile

class RiskProfileSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = RiskProfile
        fields = [
            'id', 'max_daily_loss', 'max_trades_per_day', 
            'current_daily_loss', 'trades_today', 
            'is_locked', 'lock_reason', 'status'
        ]
        read_only_fields = ['current_daily_loss', 'trades_today', 'is_locked', 'lock_reason']

    def get_status(self, obj):
        allowed, reason = obj.check_discipline()
        return {'allowed': allowed, 'reason': reason}

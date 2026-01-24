from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Avg, Q
from .models import Trade
from .serializers import TradeSerializer, TradeStatsSerializer

class TradeViewSet(viewsets.ModelViewSet):
    serializer_class = TradeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Trade.objects.filter(user=self.request.user)
        strategy_id = self.request.query_params.get('strategy')
        if strategy_id:
            queryset = queryset.filter(strategy_id=strategy_id)
        return queryset
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get aggregated statistics for the user's trades."""
        queryset = self.get_queryset()
        
        total = queryset.count()
        wins = queryset.filter(result='WIN').count()
        losses = queryset.filter(result='LOSS').count()
        
        win_rate = (wins / total * 100) if total > 0 else 0
        
        total_pnl = queryset.aggregate(total=Sum('pnl'))['total'] or 0
        avg_win = queryset.filter(result='WIN').aggregate(avg=Avg('pnl'))['avg']
        avg_loss = queryset.filter(result='LOSS').aggregate(avg=Avg('pnl'))['avg']
        
        disciplined_trades = queryset.filter(followed_plan=True).count()
        discipline_rate = (disciplined_trades / total * 100) if total > 0 else 0
        
        data = {
            'total_trades': total,
            'wins': wins,
            'losses': losses,
            'win_rate': round(win_rate, 1),
            'total_pnl': total_pnl,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'discipline_rate': round(discipline_rate, 1),
        }
        
        serializer = TradeStatsSerializer(data)
        return Response(serializer.data)

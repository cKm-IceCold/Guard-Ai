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

    def perform_create(self, serializer):
        # Save the trade
        trade = serializer.save(user=self.request.user)
        
        # SYNC RISK GUARDIAN: Increment daily trade count
        profile = self.request.user.risk_profile
        profile.trades_today += 1
        
        # Check if this trade broke the discipline cap
        profile.check_discipline()
        profile.save()

    def perform_update(self, serializer):
        # Check if we are closing a trade
        old_status = self.get_object().status
        trade = serializer.save()
        
        if old_status == 'OPEN' and trade.status == 'CLOSED':
            # SYNC RISK GUARDIAN: If it was a loss, add to daily loss
            if trade.result == 'LOSS' and trade.pnl:
                profile = self.request.user.risk_profile
                # We add the absolute value of loss to current_daily_loss
                profile.current_daily_loss += abs(trade.pnl)
                profile.check_discipline()
                profile.save()
    
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

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Combined analytics for charts"""
        trades = self.get_queryset().filter(status='CLOSED').order_by('created_at')
        
        equity_curve = []
        running_pnl = 0
        
        discipline_trend = []
        
        for i, trade in enumerate(trades):
            running_pnl += float(trade.pnl or 0)
            equity_curve.append({
                'id': trade.id,
                'date': trade.created_at.strftime('%Y-%m-%d'),
                'pnl': running_pnl
            })
            
            # Simple moving average of discipline over last 5 trades
            recent_trades = trades[:i+1]
            if len(recent_trades) > 5:
                recent_trades = recent_trades[len(recent_trades)-5:]
            
            disc_count = sum(1 for t in recent_trades if t.followed_plan)
            score = (disc_count / len(recent_trades)) * 100
            
            discipline_trend.append({
                'id': trade.id,
                'date': trade.created_at.strftime('%Y-%m-%d'),
                'score': score
            })

        return Response({
            'equity_curve': equity_curve,
            'discipline_trend': discipline_trend
        })

    @action(detail=False, methods=['post'], url_path='populate-demo')
    def populate_demo(self, request):
        """Dev only: Populate with mock data for demonstration"""
        from strategies.models import Strategy
        import random
        from django.utils import timezone
        from datetime import timedelta

        # Ensure we have a strategy
        strategy, _ = Strategy.objects.get_or_create(
            user=request.user,
            name="Alpha Trend Protocol",
            defaults={'description': 'Main trend following system'}
        )

        Trade.objects.filter(user=request.user).delete() # Clean start
        
        running_pnl = 0
        now = timezone.now()
        
        for i in range(20):
            result = random.choice(['WIN', 'LOSS', 'WIN', 'BREAKEVEN'])
            pnl = random.randint(50, 200) if result == 'WIN' else random.randint(-150, -50) if result == 'LOSS' else 0
            
            Trade.objects.create(
                user=request.user,
                strategy=strategy,
                status='CLOSED',
                result=result,
                pnl=pnl,
                followed_plan=random.random() > 0.2, # 80% discipline
                created_at=now - timedelta(days=20-i)
            )
            
        return Response({'status': 'Demo data generated'})

    @action(detail=False, methods=['post'], url_path='full-reset')
    def full_reset(self, request):
        """Clean wipe: Delete all strategies, trades, and reset risk engine"""
        from strategies.models import Strategy
        from risk_engine.models import RiskProfile
        
        # Delete data
        Trade.objects.filter(user=request.user).delete()
        Strategy.objects.filter(user=request.user).delete()
        
        # Reset Risk Profile
        profile, _ = RiskProfile.objects.get_or_create(user=request.user)
        profile.reset_daily_stats()
        
        return Response({'status': 'Account reset complete'})

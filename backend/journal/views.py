from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Avg, Q
from .models import Trade
from .serializers import TradeSerializer, TradeStatsSerializer

from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
import logging

logger = logging.getLogger(__name__)

class TradeViewSet(viewsets.ModelViewSet):
    """
    Main ViewSet for managing trading activity.
    Handles trade creation, closure, and synchronization with the Risk Engine.
    Includes advanced actions for performance analytics and AI-driven behavioral analysis.
    """
    serializer_class = TradeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_queryset(self):
        """
        Filters trades by the authenticated user.
        Accepts '?strategy=<id>' as a query parameter to filter by a specific strategy.
        """
        queryset = Trade.objects.filter(user=self.request.user)
        strategy_id = self.request.query_params.get('strategy')
        if strategy_id:
            queryset = queryset.filter(strategy_id=strategy_id)
        return queryset

    def perform_create(self, serializer):
        """
        Executed when a new trade is opened.
        1. Saves the trade to the database.
        2. Updates the Risk Engine profile with the latest trade count.
        3. Scans for potential 'over-trading' limit violations.
        """
        trade = serializer.save(user=self.request.user)
        
        # Risk Sync: Update activity counters
        profile = self.request.user.risk_profile
        profile.trades_today += 1
        profile.trades_this_month += 1
        profile.trades_this_year += 1
        
        # Enforcement: Check if this trade triggers a terminal lockout
        profile.check_discipline()
        profile.save()

    def update(self, request, *args, **kwargs):
        """Override update to provide detailed error logging for debugging."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            logger.error(f"Trade Update Validation Error: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        """
        Executed when a trade is updated (typically when closed).
        Logs losses to the Risk Engine to enforce daily drawdown limits.
        """
        old_status = self.get_object().status
        trade = serializer.save()
        
        # Trigger risk check only upon trade closure
        if old_status == 'OPEN' and trade.status == 'CLOSED':
            if trade.result == 'LOSS' and trade.pnl:
                profile = self.request.user.risk_profile
                # Record absolute loss for drawdown calculation
                profile.current_daily_loss += abs(trade.pnl)
                # Re-evaluate locking status
                profile.check_discipline()
                profile.save()
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Returns high-level performance KPIs.
        Calculates Win Rate, Total PnL, Average R/R, and 'Discipline Score'.
        Used for dashboard metrics.
        """
        queryset = self.get_queryset()
        
        total = queryset.count()
        wins = queryset.filter(result='WIN').count()
        losses = queryset.filter(result='LOSS').count()
        
        win_rate = (wins / total * 100) if total > 0 else 0
        total_pnl = queryset.aggregate(total=Sum('pnl'))['total'] or 0
        avg_win = queryset.filter(result='WIN').aggregate(avg=Avg('pnl'))['avg']
        avg_loss = queryset.filter(result='LOSS').aggregate(avg=Avg('pnl'))['avg']
        
        # Discipline Score: Percent of trades that didn't violate the AI checklist
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
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Returns time-series data for front-end charts.
        - `equity_curve`: Cumulative PnL over time.
        - `discipline_trend`: A 5-trade rolling average of checklist compliance.
        """
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
            
            # Discipline MA-5
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
        """
        Utility: Populates the account with 20 historical trades.
        Useful for presentation and testing chart rendering.
        """
        from strategies.models import Strategy
        import random
        from django.utils import timezone
        from datetime import timedelta

        strategy, _ = Strategy.objects.get_or_create(
            user=request.user,
            name="Alpha Trend Protocol",
            defaults={'description': 'Main trend following system'}
        )

        Trade.objects.filter(user=request.user).delete()
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
                followed_plan=random.random() > 0.2,
                created_at=now - timedelta(days=20-i)
            )
            
        return Response({'status': 'Demo data generated'})

    @action(detail=False, methods=['post'], url_path='full-reset')
    def full_reset(self, request):
        """
        Nuclear Reset: Deletes all trades and strategies for the user.
        Also resets all Risk Engine counters (Daily/Monthly/Yearly trade counts).
        """
        from strategies.models import Strategy
        from risk_engine.models import RiskProfile
        
        Trade.objects.filter(user=request.user).delete()
        Strategy.objects.filter(user=request.user).delete()
        
        profile, _ = RiskProfile.objects.get_or_create(user=request.user)
        profile.reset_daily_stats()
        
        return Response({'status': 'Account reset complete'})

    @action(detail=False, methods=['get'])
    def insights(self, request):
        """
        Behavioral AI Insights.
        1. Fetches the last 30 trades.
        2. Formats them into a simplified log.
        3. Uses the AI Service to detect patterns like 'revenge trading' or 
           'impulsive entries' the trader might have missed.
        """
        from core.ai_service import ai_service
        
        trades = self.get_queryset().order_by('-created_at')[:30]
        if not trades:
             return Response({
                "impulse_alerts": ["Insufficient data to perform behavioral analysis."], 
                "strength_matrix": ["Log at least 5 trades to unlock AI psych analysis."], 
                "projected_yield": "Unknown"
            })

        # Process log for AI consumption
        trade_data = "Date | Strategy | Result | PnL | Followed Plan | Notes\n"
        for t in trades:
            strategy_name = t.strategy.name if t.strategy else "Unknown"
            trade_data += f"{t.created_at.date()} | {strategy_name} | {t.result} | {t.pnl} | {t.followed_plan} | {t.notes}\n"
            
        # Analysis triggered via core.ai_service
        analysis = ai_service.analyze_behavior(trade_data)
        return Response(analysis)


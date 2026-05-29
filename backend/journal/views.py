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
        Calculates Win Rate, Total PnL, Average R/R, Discipline Score,
        Profit Factor, Max Drawdown, Best/Worst Trade, and Streaks.
        Used for dashboard metrics.
        """
        queryset = self.get_queryset()
        closed = queryset.filter(status='CLOSED')
        
        total = closed.count()
        wins = closed.filter(result='WIN').count()
        losses = closed.filter(result='LOSS').count()
        
        win_rate = (wins / total * 100) if total > 0 else 0
        total_pnl = closed.aggregate(total=Sum('pnl'))['total'] or 0
        avg_win = closed.filter(result='WIN').aggregate(avg=Avg('pnl'))['avg'] or 0
        avg_loss = closed.filter(result='LOSS').aggregate(avg=Avg('pnl'))['avg'] or 0
        
        # Discipline Score: Percent of trades that followed the AI checklist
        disciplined_trades = closed.filter(followed_plan=True).count()
        discipline_rate = (disciplined_trades / total * 100) if total > 0 else 0
        
        # Profit Factor: Gross Profit / Gross Loss (the #1 metric for pros)
        gross_profit = closed.filter(pnl__gt=0).aggregate(total=Sum('pnl'))['total'] or 0
        gross_loss = abs(closed.filter(pnl__lt=0).aggregate(total=Sum('pnl'))['total'] or 0)
        profit_factor = round(float(gross_profit / gross_loss), 2) if gross_loss > 0 else 0
        
        # Best / Worst Trade
        from django.db.models import Max, Min
        best_trade = closed.aggregate(best=Max('pnl'))['best'] or 0
        worst_trade = closed.aggregate(worst=Min('pnl'))['worst'] or 0
        
        # Average Risk:Reward Ratio
        avg_rr = round(abs(float(avg_win) / float(avg_loss)), 2) if avg_loss != 0 else 0
        
        # Max Drawdown: Largest peak-to-trough decline in cumulative PnL
        max_drawdown = 0
        if total > 0:
            trades_ordered = closed.order_by('created_at').values_list('pnl', flat=True)
            running_pnl = 0
            peak = 0
            for pnl_val in trades_ordered:
                running_pnl += float(pnl_val or 0)
                if running_pnl > peak:
                    peak = running_pnl
                drawdown = peak - running_pnl
                if drawdown > max_drawdown:
                    max_drawdown = drawdown
        
        # Consecutive Win/Loss Streaks
        current_streak = 0
        max_win_streak = 0
        max_loss_streak = 0
        current_win = 0
        current_loss = 0
        if total > 0:
            results = closed.order_by('created_at').values_list('result', flat=True)
            for r in results:
                if r == 'WIN':
                    current_win += 1
                    current_loss = 0
                    max_win_streak = max(max_win_streak, current_win)
                elif r == 'LOSS':
                    current_loss += 1
                    current_win = 0
                    max_loss_streak = max(max_loss_streak, current_loss)
                else:
                    current_win = 0
                    current_loss = 0
        
        data = {
            'total_trades': total,
            'wins': wins,
            'losses': losses,
            'win_rate': round(win_rate, 1),
            'total_pnl': total_pnl,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'discipline_rate': round(discipline_rate, 1),
            # New metrics
            'profit_factor': profit_factor,
            'avg_rr': avg_rr,
            'max_drawdown': round(max_drawdown, 2),
            'best_trade': best_trade,
            'worst_trade': worst_trade,
            'max_win_streak': max_win_streak,
            'max_loss_streak': max_loss_streak,
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

    @action(detail=False, methods=['get'], url_path='behavior-alerts')
    def behavior_alerts(self, request):
        """
        Real-time deterministic behavior analysis — no AI cost.
        Scans recent trades for dangerous patterns:
          - Consecutive losses (revenge trading risk)
          - Rapid-fire trade entries (overtrading)
          - Trades logged without Stop Loss notes (over-risking)
          - High loss streak vs win streak divergence
        Returns a list of color-coded alerts for the dashboard.
        """
        from django.utils import timezone
        from datetime import timedelta

        user = request.user
        queryset = self.get_queryset()
        alerts = []

        # --- 1. REVENGE TRADING DETECTOR ---
        # Check for 2+ consecutive losses in the last 5 closed trades
        recent_closed = queryset.filter(status='CLOSED').order_by('-created_at')[:5]
        consecutive_losses = 0
        for t in recent_closed:
            if t.result == 'LOSS':
                consecutive_losses += 1
            else:
                break  # Stop at first non-loss

        if consecutive_losses >= 2:
            alerts.append({
                "type": "danger",
                "icon": "psychology_alt",
                "title": "Revenge Trading Risk",
                "message": f"You have {consecutive_losses} consecutive losses. Studies show the next trade is 40% more likely to be emotional. Consider stepping away.",
            })

        # --- 2. OVERTRADING DETECTOR ---
        # Check if more than 3 trades were opened in the last 2 hours
        two_hours_ago = timezone.now() - timedelta(hours=2)
        recent_rapid = queryset.filter(created_at__gte=two_hours_ago).count()
        if recent_rapid >= 3:
            alerts.append({
                "type": "warning",
                "icon": "bolt",
                "title": "Rapid Execution Detected",
                "message": f"{recent_rapid} trades opened in the last 2 hours. Overtrading erodes edge. Slow down and wait for high-probability setups only.",
            })

        # --- 3. DISCIPLINE SLIP DETECTOR ---
        # Check if recent trades are NOT following the plan
        recent_5 = queryset.filter(status='CLOSED').order_by('-created_at')[:5]
        if recent_5.count() >= 3:
            off_plan = sum(1 for t in recent_5 if not t.followed_plan)
            if off_plan >= 2:
                alerts.append({
                    "type": "warning",
                    "icon": "rule",
                    "title": "Plan Adherence Slipping",
                    "message": f"{off_plan} of your last {recent_5.count()} trades deviated from your strategy plan. Consistency is your edge — protect it.",
                })

        # --- 4. OPEN TRADES WITH NO NOTES (potential no-SL risk) ---
        open_no_notes = queryset.filter(status='OPEN', notes='').count()
        if open_no_notes > 0:
            alerts.append({
                "type": "warning",
                "icon": "warning",
                "title": f"{open_no_notes} Unprotected Open Trade{'s' if open_no_notes > 1 else ''}",
                "message": "You have open trades with no notes or stop-loss plan logged. Add your SL level and trade rationale to maintain full risk control.",
            })

        # --- 5. POSITIVE REINFORCEMENT (no alerts) ---
        if not alerts:
            # Show positive affirmation if last 3 trades were wins and disciplined
            last_3 = queryset.filter(status='CLOSED').order_by('-created_at')[:3]
            all_good = all(t.result == 'WIN' and t.followed_plan for t in last_3)
            if last_3.count() == 3 and all_good:
                alerts.append({
                    "type": "success",
                    "icon": "verified",
                    "title": "Outstanding Discipline",
                    "message": "Your last 3 trades were wins following your plan. This is elite execution. Keep this standard.",
                })
            else:
                alerts.append({
                    "type": "success",
                    "icon": "shield",
                    "title": "All Systems Clear",
                    "message": "No behavioral risk patterns detected. Your trading discipline metrics are within healthy parameters.",
                })

        return Response({"alerts": alerts})


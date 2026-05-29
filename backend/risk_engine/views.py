from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, mixins, permissions, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import RiskProfile
from .serializers import RiskProfileSerializer
from journal.models import Trade

class RiskProfileViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    """
    ViewSet for managing the user's Risk Profile.
    Implements mandatory risk enforcement and auto-provisioning of profiles.
    """
    serializer_class = RiskProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """
        Retrieves the current user's risk profile.
        If no profile exists (e.g., new user), one is automatically created with default limits.
        """
        try:
            return self.request.user.risk_profile
        except RiskProfile.DoesNotExist:
            # Auto-provisioning with a conservative $200 daily loss limit.
            return RiskProfile.objects.create(user=self.request.user, max_daily_loss=200.00)

    @action(detail=False, methods=['get', 'patch'], url_path='current')
    def current(self, request):
        """
        Custom endpoint for managing the risk profile without needing the ID in the URL.
        Matches the frontend path: `/api/risk/risk-profile/current/`.
        """
        profile = self.get_object()
        
        # Handle manual updates to the risk limits.
        if request.method == 'PATCH':
            # Block modifications if the terminal is currently locked due to a violation.
            if profile.is_locked:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Changes to Risk limits are prohibited while the terminal is locked. Integrity is key.")
            
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        # Return the current profile state.
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='reset-demo')
    def reset_demo(self, request):
        """
        Developer Utility: Resets the user's daily trade count and loss stats.
        Useful for testing terminal locking and unlocking logic.
        """
        profile = self.get_object()
        profile.reset_daily_stats()
        return Response({'status': 'Risk stats reset'})

class MT5SyncView(APIView):
    """
    HTTP POST endpoint called by the Guard AI MQL5 Expert Advisor.
    Synchronizes MT5 active positions with the django Trade journal and checks RiskProfile rules.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        balance = Decimal(str(data.get("balance", "0.0")))
        equity = Decimal(str(data.get("equity", "0.0")))
        positions = data.get("positions", [])

        # 1. Fetch risk profile
        try:
            risk_profile = user.risk_profile
        except RiskProfile.DoesNotExist:
            risk_profile = RiskProfile.objects.create(user=user, max_daily_loss=200.00)

        # 2. Check for daily resets
        risk_profile.check_discipline()

        # 3. Handle live daily drawdown calculations
        # Establish start-of-day equity baseline if none is registered
        if not hasattr(risk_profile, 'starting_daily_equity') or risk_profile.current_daily_loss == Decimal("0.00"):
            risk_profile.starting_daily_equity = balance
            risk_profile.save()

        current_loss = risk_profile.starting_daily_equity - equity
        if current_loss > 0:
            risk_profile.current_daily_loss = current_loss
        else:
            risk_profile.current_daily_loss = Decimal("0.00")
        
        risk_profile.save()

        # 4. Process open positions reported by EA
        incoming_tickets = []
        for pos in positions:
            ticket = str(pos.get("ticket"))
            symbol = pos.get("symbol", "UNKNOWN")
            side_num = pos.get("type", 0) # 0 = Buy, 1 = Sell in MQL
            side = "BUY" if side_num == 0 else "SELL"
            pnl = Decimal(str(pos.get("pnl", "0.00")))

            incoming_tickets.append(ticket)

            # Sync position ticket into Trade database
            trade, trade_created = Trade.objects.get_or_create(
                user=user,
                external_id=ticket,
                defaults={
                    "symbol": symbol,
                    "side": side,
                    "status": "OPEN",
                    "pnl": pnl,
                    "followed_plan": True
                }
            )

            if not trade_created:
                # Update current running profit/loss
                trade.pnl = pnl
                trade.save()
            else:
                # Increment metrics for newly detected trades
                risk_profile.trades_today += 1
                risk_profile.trades_this_month += 1
                risk_profile.trades_this_year += 1
                risk_profile.save()

        # 5. Automatically detect CLOSED positions (Self-Healing Set Difference)
        # Any trade currently marked as 'OPEN' with an external_id that did not arrive is closed.
        open_trades = Trade.objects.filter(user=user, status="OPEN").exclude(external_id__isnull=True).exclude(external_id="")
        for open_trade in open_trades:
            if open_trade.external_id not in incoming_tickets:
                open_trade.status = "CLOSED"
                open_trade.result = "WIN" if open_trade.pnl > 0 else ("LOSS" if open_trade.pnl < 0 else "BREAKEVEN")
                open_trade.save()

        # 6. Run enforcement and rules evaluation
        allowed, message = risk_profile.check_discipline()

        return Response({
            "is_locked": risk_profile.is_locked,
            "lock_reason": risk_profile.lock_reason,
            "current_daily_loss": float(risk_profile.current_daily_loss),
            "max_daily_loss": float(risk_profile.max_daily_loss),
            "trades_today": risk_profile.trades_today,
            "max_trades_per_day": risk_profile.max_trades_per_day
        }, status=status.HTTP_200_OK)


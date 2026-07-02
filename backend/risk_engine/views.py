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
    HTTP POST endpoint called by the Guard AI MQL5 Expert Advisor every 5 seconds.

    PROP-FIRM STYLE ENFORCEMENT:
    ─────────────────────────────
    1.  EA sends: balance, equity (balance + floating P&L), open positions list.
    2.  On first sync of the day, we record `daily_start_equity` as the baseline.
    3.  Live Drawdown = daily_start_equity − current_equity  (includes floating losses).
    4.  If drawdown breaches max_daily_loss ($) OR max_daily_loss_pct (%) → LOCK.
    5.  Over-trade limit checks run on every sync too.
    6.  Response tells the EA: is_locked, current drawdown, limits — EA acts immediately.

    This mirrors exactly how FTMO / The5ers enforce rules at the server level,
    but running inside the trader's own MT5 terminal via the EA bridge.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        # ── Parse EA payload ────────────────────────────────────────────────
        try:
            balance = Decimal(str(data.get("balance", "0.0")))
            equity  = Decimal(str(data.get("equity",  "0.0")))
        except Exception:
            return Response({"error": "Invalid balance/equity values"}, status=status.HTTP_400_BAD_REQUEST)

        positions = data.get("positions", [])

        # ── Load / auto-create Risk Profile ────────────────────────────────
        try:
            profile = user.risk_profile
        except RiskProfile.DoesNotExist:
            profile = RiskProfile.objects.create(user=user, max_daily_loss=200.00)

        # ── Daily reset check (new trading day → reset baseline) ────────────
        profile.check_discipline()   # handles date-based resets internally

        now = timezone.now()

        # ── Establish start-of-day equity baseline ──────────────────────────
        # Only set once per day (daily_start_equity is reset to 0 at midnight by reset_daily_stats)
        if profile.daily_start_equity == Decimal("0.00") and equity > Decimal("0.00"):
            profile.daily_start_equity = equity

        # ── Update live equity tracking ─────────────────────────────────────
        profile.current_live_equity = equity
        profile.last_ea_sync = now

        # ── CORE DRAWDOWN CALCULATION (Prop-Firm Style) ─────────────────────
        # Live drawdown = money lost from start of day including ALL open floating P&L
        live_drawdown = profile.daily_start_equity - equity
        if live_drawdown < Decimal("0.00"):
            live_drawdown = Decimal("0.00")   # Equity grown → no drawdown

        profile.current_daily_loss = live_drawdown
        profile.save()

        # ── HARD ENFORCEMENT: Check all limits ──────────────────────────────
        if not profile.is_locked:

            # 1. ABSOLUTE $ DRAWDOWN LIMIT  (e.g. max $200 loss)
            if live_drawdown >= profile.max_daily_loss:
                profile.lock_account(
                    f"Daily loss limit hit: ${float(live_drawdown):.2f} lost "
                    f"(limit ${float(profile.max_daily_loss):.2f}). "
                    f"Trading suspended for 12 hours."
                )

            # 2. PERCENTAGE DRAWDOWN LIMIT  (e.g. 5% of start equity like FTMO)
            elif profile.daily_start_equity > Decimal("0.00"):
                drawdown_pct = (live_drawdown / profile.daily_start_equity) * Decimal("100")
                if drawdown_pct >= profile.max_daily_loss_pct:
                    profile.lock_account(
                        f"Daily drawdown limit hit: {float(drawdown_pct):.2f}% "
                        f"(limit {float(profile.max_daily_loss_pct):.2f}%). "
                        f"Trading suspended for 12 hours."
                    )

            # 3. OVER-TRADING LIMIT
            elif profile.trades_today >= profile.max_trades_per_day:
                profile.lock_account(
                    f"Max daily trades reached: {profile.trades_today} trades "
                    f"(limit {profile.max_trades_per_day})."
                )

        # ── Sync open positions → Trade journal ─────────────────────────────
        incoming_tickets = []
        for pos in positions:
            ticket = str(pos.get("ticket", ""))
            if not ticket:
                continue

            symbol   = pos.get("symbol", "UNKNOWN")
            side     = "BUY" if pos.get("type", 0) == 0 else "SELL"
            lot_size = Decimal(str(pos.get("lots", "0.01")))
            pos_pnl  = Decimal(str(pos.get("pnl", "0.00")))
            incoming_tickets.append(ticket)

            trade, created = Trade.objects.get_or_create(
                user=user,
                external_id=ticket,
                defaults={
                    "symbol": symbol,
                    "side": side,
                    "status": "OPEN",
                    "pnl": pos_pnl,
                    "followed_plan": True,
                }
            )
            if not created:
                trade.pnl = pos_pnl
                trade.save()
            else:
                # New position detected — count it
                profile.trades_today += 1
                profile.trades_this_month += 1
                profile.trades_this_year += 1
                profile.save()

        # ── Self-heal: mark vanished open positions as CLOSED ────────────────
        orphaned = Trade.objects.filter(
            user=user, status="OPEN"
        ).exclude(external_id__isnull=True).exclude(external_id="")

        for t in orphaned:
            if t.external_id not in incoming_tickets:
                t.status = "CLOSED"
                t.result = "WIN" if t.pnl > 0 else ("LOSS" if t.pnl < 0 else "BREAKEVEN")
                t.save()

        # ── Build drawdown % for EA display ────────────────────────────────
        drawdown_pct = 0.0
        if profile.daily_start_equity > Decimal("0.00"):
            drawdown_pct = float(
                (profile.current_daily_loss / profile.daily_start_equity) * Decimal("100")
            )

        return Response({
            # Core lock signal — EA checks this first
            "is_locked":            profile.is_locked,
            "lock_reason":          profile.lock_reason or "",

            # Live drawdown data for EA overlay display
            "current_daily_loss":   float(profile.current_daily_loss),
            "max_daily_loss":       float(profile.max_daily_loss),
            "drawdown_pct":         round(drawdown_pct, 2),
            "max_drawdown_pct":     float(profile.max_daily_loss_pct),
            "daily_start_equity":   float(profile.daily_start_equity),
            "current_equity":       float(equity),

            # Trade count data
            "trades_today":         profile.trades_today,
            "max_trades_per_day":   profile.max_trades_per_day,

            # EA heartbeat confirmation
            "sync_status":          "ok",
            "server_time":          now.isoformat(),
        }, status=status.HTTP_200_OK)


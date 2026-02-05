from django.utils import timezone
from datetime import timedelta
from django.db import models
from django.conf import settings

class RiskProfile(models.Model):
    """
    Core Risk Management logic for a user.
    Tracks live performance against daily, monthly, and yearly limits.
    Enforces a 'Terminal Lock' (cooling off period) when limits are breached.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='risk_profile')
    
    # Static Limits (Configurable by user)
    max_daily_loss = models.DecimalField(max_digits=10, decimal_places=2, default=200.00, help_text="Maximum allowed loss per day in USD")
    max_trades_per_day = models.IntegerField(default=5)
    max_trades_monthly = models.IntegerField(default=100)
    max_trades_yearly = models.IntegerField(default=1000)
    
    # Real-time Performance Tracking
    current_daily_loss = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    trades_today = models.IntegerField(default=0)
    trades_this_month = models.IntegerField(default=0)
    trades_this_year = models.IntegerField(default=0)
    
    # Enforcement State
    is_locked = models.BooleanField(default=False, help_text="If True, user cannot open new trades")
    lock_reason = models.CharField(max_length=255, blank=True, null=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    
    # Reset Timestamps
    last_reset_date = models.DateField(default=timezone.now)
    last_monthly_reset = models.DateField(default=timezone.now)
    last_yearly_reset = models.DateField(default=timezone.now)

    def __str__(self):
        return f"{self.user.email} - Risk Profile"

    def check_discipline(self):
        """
        The 'Judge' method. Called before trade entry and after trade closure.
        1. Resets statistics if a new day/month/year has started.
        2. Checks if an existing 12-hour lock has expired.
        3. Scans for new breaches of PnL or volume limits.
        """
        now = timezone.now()
        today = now.date()

        # Automatic Stat Periodic Resets
        if self.last_reset_date != today:
            self.reset_daily_stats()
        
        if self.last_monthly_reset.month != today.month or self.last_monthly_reset.year != today.year:
            self.reset_monthly_stats()
            
        if self.last_yearly_reset.year != today.year:
            self.reset_yearly_stats()

        # Enforcement Logic
        if self.is_locked:
            # COOLING OFF PERIOD: Locks last for 12 hours from 'locked_at'
            if self.locked_at and now > self.locked_at + timedelta(hours=12):
                self.reset_daily_stats() # Auto-unlock after time expiry
                return True, "Trading Allowed (Lock Expired)"
            return False, f"Account Locked: {self.lock_reason}"
            
        # Drawdown Breach
        if self.current_daily_loss >= self.max_daily_loss:
            self.lock_account(f"Daily Loss Limit (${self.max_daily_loss}) hit.")
            return False, "Daily Loss Limit Exceeded"
            
        # Over-trading Breaches
        if self.trades_today >= self.max_trades_per_day:
            self.lock_account(f"Max Daily Trades ({self.max_trades_per_day}) hit.")
            return False, "Max Daily Trades Limit Exceeded"
            
        if self.trades_this_month >= self.max_trades_monthly:
            self.lock_account(f"Max Monthly Trades ({self.max_trades_monthly}) hit.")
            return False, "Max Monthly Trades Limit Exceeded"

        if self.trades_this_year >= self.max_trades_yearly:
            self.lock_account(f"Max Yearly Trades ({self.max_trades_yearly}) hit.")
            return False, "Max Yearly Trades Limit Exceeded"

        return True, "Trading Allowed"

    def lock_account(self, reason):
        """Disables trading for the account and records the timestamp of the breach."""
        self.is_locked = True
        self.lock_reason = reason
        self.locked_at = timezone.now()
        self.save()

    def reset_daily_stats(self):
        """Resets daily performance metrics and releases the account lock."""
        self.current_daily_loss = 0
        self.trades_today = 0
        self.is_locked = False
        self.lock_reason = None
        self.locked_at = None
        self.last_reset_date = timezone.now().date()
        self.save()

    def reset_monthly_stats(self):
        """Resets monthly trade counters."""
        self.trades_this_month = 0
        self.last_monthly_reset = timezone.now().date()
        self.save()

    def reset_yearly_stats(self):
        """Resets yearly trade counters."""
        self.trades_this_year = 0
        self.last_yearly_reset = timezone.now().date()
        self.save()


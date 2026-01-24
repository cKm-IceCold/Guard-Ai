from django.utils import timezone
from datetime import timedelta
from django.db import models
from django.conf import settings

class RiskProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='risk_profile')
    max_daily_loss = models.DecimalField(max_digits=10, decimal_places=2, default=200.00, help_text="Maximum allowed loss per day in USD")
    max_trades_per_day = models.IntegerField(default=5)
    
    # Live Tracking
    current_daily_loss = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    trades_today = models.IntegerField(default=0)
    
    # Locking Mechanism
    is_locked = models.BooleanField(default=False)
    lock_reason = models.CharField(max_length=255, blank=True, null=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    last_reset_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - Risk Profile"

    def check_discipline(self):
        """
        Validates if the user is allowed to trade.
        Returns (allowed: bool, reason: str)
        """
        if self.is_locked:
            # Check if 12 hours have passed since lock
            if self.locked_at and timezone.now() > self.locked_at + timedelta(hours=12):
                self.reset_daily_stats()
                return True, "Trading Allowed (Lock Expired)"
            return False, f"Account Locked: {self.lock_reason}"
            
        if self.current_daily_loss >= self.max_daily_loss:
            self.lock_account(f"Daily Loss Limit (${self.max_daily_loss}) hit.")
            return False, "Daily Loss Limit Exceeded"
            
        if self.trades_today >= self.max_trades_per_day:
            self.lock_account(f"Max Trades ({self.max_trades_per_day}) hit.")
            return False, "Max Trades Limit Exceeded"
            
        return True, "Trading Allowed"

    def lock_account(self, reason):
        self.is_locked = True
        self.lock_reason = reason
        self.locked_at = timezone.now()
        self.save()

    def reset_daily_stats(self):
        self.current_daily_loss = 0
        self.trades_today = 0
        self.is_locked = False
        self.lock_reason = None
        self.locked_at = None
        self.save()

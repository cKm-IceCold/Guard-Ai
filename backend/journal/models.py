from django.db import models
from django.conf import settings
from strategies.models import Strategy

class Trade(models.Model):
    """
    Represents a single trading operation.
    Tracks technical data (symbol, side), results (PnL), and behavioral data (followed_plan).
    Integrates with 'Strategies' to measure which trading plans are most profitable.
    """
    RESULT_CHOICES = [
        ('WIN', 'Win'),
        ('LOSS', 'Loss'),
        ('BREAKEVEN', 'Breakeven'),
    ]
    
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('CLOSED', 'Closed'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trades')
    strategy = models.ForeignKey(Strategy, on_delete=models.CASCADE, related_name='trades', null=True, blank=True)
    
    # Mirroring real-world broker execution data
    symbol = models.CharField(max_length=50, blank=True, help_text="e.g., BTCUSDT, EURUSD")
    side = models.CharField(max_length=10, blank=True, help_text="BUY or SELL")
    external_id = models.CharField(max_length=100, blank=True, null=True, db_index=True, help_text="ID from Binance/MT5")
    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    result = models.CharField(max_length=10, choices=RESULT_CHOICES, null=True, blank=True)
    pnl = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True, help_text="Profit or Loss value")
    notes = models.TextField(blank=True, help_text="User's reflection on the trade")
    
    # Behavioral Tracking (The 'Guard' aspect)
    followed_plan = models.BooleanField(default=True, help_text="Automatically set based on checklist completion")
    
    # Pictures of the chart at different stages of the trade
    image_before = models.ImageField(upload_to='trades/before/', null=True, blank=True, help_text="Entry setup")
    image_after = models.ImageField(upload_to='trades/after/', null=True, blank=True, help_text="Exit outcome")
    image_live = models.ImageField(upload_to='trades/live/', null=True, blank=True, help_text="Intra-trade status")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        strategy_name = self.strategy.name if self.strategy else "No Strategy"
        return f"{self.status} | {strategy_name} | {self.user.email}"


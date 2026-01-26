from django.db import models
from django.conf import settings
from strategies.models import Strategy

class Trade(models.Model):
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
    
    # Broker Integration Fields
    symbol = models.CharField(max_length=50, blank=True)
    side = models.CharField(max_length=10, blank=True) # BUY/SELL
    external_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    result = models.CharField(max_length=10, choices=RESULT_CHOICES, null=True, blank=True)
    pnl = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    notes = models.TextField(blank=True)
    followed_plan = models.BooleanField(default=True, help_text="True if trader completed checklist before entry")
    
    # Visual Journaling (Optional Pictures)
    image_before = models.ImageField(upload_to='trades/before/', null=True, blank=True)
    image_after = models.ImageField(upload_to='trades/after/', null=True, blank=True)
    image_live = models.ImageField(upload_to='trades/live/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        strategy_name = self.strategy.name if self.strategy else "No Strategy"
        return f"{self.status} | {strategy_name} | {self.user.email}"

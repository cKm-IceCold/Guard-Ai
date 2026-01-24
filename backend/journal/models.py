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
    strategy = models.ForeignKey(Strategy, on_delete=models.CASCADE, related_name='trades')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    result = models.CharField(max_length=10, choices=RESULT_CHOICES, null=True, blank=True)
    pnl = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    notes = models.TextField(blank=True)
    followed_plan = models.BooleanField(default=True, help_text="True if trader completed checklist before entry")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.status} | {self.strategy.name} | {self.user.email}"

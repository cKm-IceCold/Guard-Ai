from django.db import models
from django.conf import settings

class Strategy(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='strategies')
    name = models.CharField(max_length=255)
    description = models.TextField(help_text="Natural language description of the strategy")
    created_at = models.DateTimeField(auto_now_add=True)
    
    # AI Generated Content
    checklist_items = models.JSONField(default=list, help_text="List of rules to check before entry")
    
    def __str__(self):
        return f"{self.name} ({self.user.email})"

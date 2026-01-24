from django.contrib import admin
from .models import RiskProfile

@admin.register(RiskProfile)
class RiskProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_locked', 'current_daily_loss', 'max_daily_loss')
    list_filter = ('is_locked',)

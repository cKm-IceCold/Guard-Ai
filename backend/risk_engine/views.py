from rest_framework import viewsets, mixins, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RiskProfile
from .serializers import RiskProfileSerializer

class RiskProfileViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    serializer_class = RiskProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Always return the current user's profile
        try:
            return self.request.user.risk_profile
        except RiskProfile.DoesNotExist:
            # Create if it doesn't exist (auto-provisioning)
            return RiskProfile.objects.create(user=self.request.user, max_daily_loss=200.00)

    def perform_update(self, serializer):
        profile = self.get_object()
        if profile.is_locked:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Changes to Risk limits are prohibited while the terminal is locked. Integrity is key.")
        serializer.save()

    @action(detail=False, methods=['post'], url_path='reset-demo')
    def reset_demo(self, request):
        """Dev only: Reset daily stats for testing"""
        profile = self.get_object()
        profile.reset_daily_stats()
        return Response({'status': 'Risk stats reset'})

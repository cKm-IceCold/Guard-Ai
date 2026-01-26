from rest_framework import viewsets, mixins, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RiskProfile
from .serializers import RiskProfileSerializer

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

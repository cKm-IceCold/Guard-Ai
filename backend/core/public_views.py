from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from core.models import User
from journal.models import Trade
from strategies.models import Strategy
from strategies.services import GeminiService
from django.db.models import Sum, Count, Q

class PublicProfileViewSet(viewsets.GenericViewSet):
    """
    Publicly accessible endpoints for sharing trading performance.
    """
    permission_classes = [AllowAny]
    queryset = User.objects.all()
    lookup_field = 'username'

    def retrieve(self, request, username=None):
        """
        GET /api/public/profile/<username>/
        Returns public-safe stats, AI-generated bio, and shared strategies.
        """
        user = get_object_or_404(User, username=username)
        
        # 1. Fetch Performance Data
        trades = Trade.objects.filter(user=user, status='CLOSED').order_by('created_at')
        total = trades.count()
        wins = trades.filter(result='WIN').count()
        win_rate = (wins / total * 100) if total > 0 else 0
        
        equity_curve = []
        running_pnl = 0
        for t in trades:
            running_pnl += float(t.pnl or 0)
            equity_curve.append({
                'date': t.created_at.strftime('%Y-%m-%d'),
                'pnl': running_pnl
            })

        # 2. Handle AI Bio (Dynamic Generation)
        if not user.bio:
            try:
                gemini = GeminiService()
                summary = f"Trader: {user.username}. Stats: {total} trades, {win_rate:.1f}% win rate, {running_pnl} total PnL."
                user.bio = gemini.generate_trader_bio(summary)
                user.save()
            except:
                user.bio = "Professional trader using Guard AI disciplined protocols."

        # 3. Fetch Public Strategies
        public_strategies = Strategy.objects.filter(user=user, is_public=True).values(
            'id', 'name', 'description', 'checklist_items'
        )

        return Response({
            'username': user.username,
            'joined_at': user.date_joined.strftime('%Y-%m-%d'),
            'bio': user.bio,
            'stats': {
                'total_trades': total,
                'win_rate': round(win_rate, 1),
                'net_profit': running_pnl,
            },
            'equity_curve': equity_curve,
            'strategies': list(public_strategies)
        })

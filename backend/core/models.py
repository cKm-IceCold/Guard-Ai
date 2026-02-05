from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet
import os

# Generate or load encryption key (should be in .env in production)
# This key is used to encrypt/decrypt sensitive broker API credentials
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key().decode())

class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Uses email as the unique identifier for authentication.
    """
    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True, help_text="AI-generated or user-defined trading bio")
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email


class BrokerConnection(models.Model):
    """
    Stores encrypted API credentials for broker integrations (Crypto/Forex).
    API Keys and Secrets are stored as encrypted blobs for security.
    """
    
    BROKER_CHOICES = [
        ('BINANCE', 'Binance'),
        ('BYBIT', 'Bybit'),
        ('KRAKEN', 'Kraken'),
        ('COINBASE', 'Coinbase'),
        ('METATRADER', 'MetaTrader 5'),
        ('OTHER', 'Other Exchange'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='broker_connections')
    broker_type = models.CharField(max_length=20, choices=BROKER_CHOICES)
    nickname = models.CharField(max_length=100, blank=True, help_text="User's personal label for this account")
    
    # Storage for encrypted credentials
    _api_key = models.TextField(db_column='api_key')
    _api_secret = models.TextField(db_column='api_secret')
    
    # MetaTrader specific fields
    mt_server = models.CharField(max_length=100, blank=True, help_text="e.g., 'ICMarkets-Demo'")
    mt_login = models.CharField(max_length=50, blank=True)
    
    is_active = models.BooleanField(default=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'broker_type', 'nickname']
    
    def __str__(self):
        return f"{self.user.email} - {self.broker_type} ({self.nickname or 'default'})"
    
    @property
    def api_key(self):
        """Decrypts the API key using the Fernet encryption key on retrieval."""
        try:
            f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
            return f.decrypt(self._api_key.encode()).decode()
        except Exception:
            return ""
    
    @api_key.setter
    def api_key(self, value):
        """Encrypts the API key before storing it in the database."""
        f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
        self._api_key = f.encrypt(value.encode()).decode()
    
    @property
    def api_secret(self):
        """Decrypts the API secret on retrieval."""
        try:
            f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
            return f.decrypt(self._api_secret.encode()).decode()
        except Exception:
            return ""
    
    @api_secret.setter
    def api_secret(self, value):
        """Encrypts the API secret before storage."""
        f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
        self._api_secret = f.encrypt(value.encode()).decode()

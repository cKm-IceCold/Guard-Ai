"""
Unified Broker Service with pluggable adapters for Forex & Crypto.
"""
import ccxt
from abc import ABC, abstractmethod
from datetime import datetime


class BaseBrokerAdapter(ABC):
    """
    Abstract base class for all broker adapters.
    Ensures a consistent interface across different brokers (Crypto vs Forex).
    """
    
    @abstractmethod
    def connect(self) -> bool:
        """Establish connection and verify credentials with the broker."""
        pass
    
    @abstractmethod
    def get_balance(self) -> dict:
        """Return account balance summary (Total, Free, Used capital)."""
        pass
    
    @abstractmethod
    def get_positions(self) -> list:
        """Return a list of currently open trading positions."""
        pass
    
    @abstractmethod
    def get_trade_history(self, since: datetime = None) -> list:
        """Return closed trades since a specific datetime for journaling."""
        pass


class CCXTAdapter(BaseBrokerAdapter):
    """
    Adapter for CCXT-supported exchanges (Binance, Bybit, Kraken, etc.).
    Provides a unified interface for 100+ crypto exchanges.
    """
    
    # Mapping our internal broker types to CCXT exchange IDs
    EXCHANGE_MAP = {
        'BINANCE': 'binance',
        'BYBIT': 'bybit',
        'KRAKEN': 'kraken',
        'COINBASE': 'coinbase',
        'OTHER': None,
    }
    
    def __init__(self, broker_type: str, api_key: str, api_secret: str, sandbox: bool = False):
        self.broker_type = broker_type
        self.api_key = api_key
        self.api_secret = api_secret
        self.sandbox = sandbox
        self.exchange = None
        
    def connect(self) -> bool:
        """Initializes the exchange client and tests connectivity."""
        exchange_id = self.EXCHANGE_MAP.get(self.broker_type)
        if not exchange_id:
            raise ValueError(f"Unsupported broker type: {self.broker_type}")
        
        # Dynamically instantiate the exchange class from ccxt
        exchange_class = getattr(ccxt, exchange_id)
        self.exchange = exchange_class({
            'apiKey': self.api_key,
            'secret': self.api_secret,
            'sandbox': self.sandbox,
            'enableRateLimit': True,
        })
        
        # Handshake: Fetch balance to confirm the API keys work
        try:
            self.exchange.fetch_balance()
            return True
        except ccxt.AuthenticationError:
            raise ValueError("Invalid API credentials")
        except Exception as e:
            raise ValueError(f"Connection failed: {str(e)}")
    
    def get_balance(self) -> dict:
        """Fetches and simplifies account balance data."""
        if not self.exchange:
            self.connect()
        
        balance = self.exchange.fetch_balance()
        
        return {
            'total': balance.get('total', {}),
            'free': balance.get('free', {}),
            'used': balance.get('used', {}),
        }
    
    def get_positions(self) -> list:
        """Fetches open positions (primarily for Futures/Margin accounts)."""
        if not self.exchange:
            self.connect()
        
        try:
            positions = self.exchange.fetch_positions()
            # Filter for active positions only
            return [
                {
                    'symbol': p['symbol'],
                    'side': p['side'],
                    'amount': p['contracts'],
                    'entry_price': p['entryPrice'],
                    'unrealized_pnl': p['unrealizedPnl'],
                }
                for p in positions if p['contracts'] and p['contracts'] > 0
            ]
        except Exception:
            # Spot accounts usually don't support fetch_positions
            return []
    
    def get_trade_history(self, since: datetime = None, symbol: str = None) -> list:
        """Fetches closed trade records for auto-journaling."""
        if not self.exchange:
            self.connect()
        
        # Convert datetime to millisecond timestamp for exchange API
        since_ms = int(since.timestamp() * 1000) if since else None
        
        try:
            trades = self.exchange.fetch_my_trades(symbol=symbol, since=since_ms, limit=50)
            return [
                {
                    'id': t['id'],
                    'symbol': t['symbol'],
                    'side': t['side'],
                    'price': t['price'],
                    'amount': t['amount'],
                    'cost': t['cost'],
                    'fee': t.get('fee', {}).get('cost', 0),
                    'timestamp': t['timestamp'],
                    'datetime': t['datetime'],
                }
                for t in trades
            ]
        except Exception as e:
            print(f"Trade history fetch error: {e}")
            return []


class MetaTraderAdapter(BaseBrokerAdapter):
    """
    Adapter for MetaTrader 5 (Forex/Indices/Metals).
    NOTE: Functions only on Windows where the MT5 Terminal application is installed and running.
    """
    
    def __init__(self, login: str, password: str, server: str):
        self.login = login
        self.password = password
        self.server = server
        self.connected = False
    
    def connect(self) -> bool:
        """Initializes direct IPC connection with the running MT5 terminal."""
        try:
            import MetaTrader5 as mt5
        except ImportError:
            raise ValueError("MetaTrader5 package not installed. Run: pip install MetaTrader5")
        
        if not mt5.initialize():
            raise ValueError(f"MT5 initialization failed: {mt5.last_error()}")
        
        # Authorize with account credentials
        authorized = mt5.login(
            login=int(self.login),
            password=self.password,
            server=self.server
        )
        
        if not authorized:
            mt5.shutdown()
            raise ValueError(f"MT5 login failed: {mt5.last_error()}")
        
        self.connected = True
        return True
    
    def get_balance(self) -> dict:
        """Gets financial stats from the MT5 account."""
        import MetaTrader5 as mt5
        
        if not self.connected:
            self.connect()
        
        info = mt5.account_info()
        if info is None:
            return {}
        
        return {
            'balance': info.balance,
            'equity': info.equity,
            'margin': info.margin,
            'free_margin': info.margin_free,
            'profit': info.profit,
        }
    
    def get_positions(self) -> list:
        """Fetches currently open market orders."""
        import MetaTrader5 as mt5
        
        if not self.connected:
            self.connect()
        
        positions = mt5.positions_get()
        if positions is None:
            return []
        
        return [
            {
                'ticket': p.ticket,
                'symbol': p.symbol,
                'side': 'BUY' if p.type == 0 else 'SELL',
                'volume': p.volume,
                'entry_price': p.price_open,
                'current_price': p.price_current,
                'profit': p.profit,
            }
            for p in positions
        ]
    
    def get_trade_history(self, since: datetime = None) -> list:
        """Fetches finalized orders (deals) from account history."""
        import MetaTrader5 as mt5
        from datetime import datetime, timedelta
        
        if not self.connected:
            self.connect()
        
        # Default to last 30 days if no start date provided
        if since is None:
            since = datetime.now() - timedelta(days=30)
        
        # Fetch deals from the local terminal database
        deals = mt5.history_deals_get(since, datetime.now())
        if deals is None:
            return []
        
        return [
            {
                'ticket': d.ticket,
                'symbol': d.symbol,
                'side': 'BUY' if d.type == 0 else 'SELL',
                'volume': d.volume,
                'price': d.price,
                'profit': d.profit,
                'commission': d.commission,
                'timestamp': d.time,
            }
            # Profit != 0 ensures we skip administrative entries like deposits
            for d in deals if d.profit != 0
        ]


def get_adapter(broker_connection) -> BaseBrokerAdapter:
    """
    Factory function: Returns the correct Adapter implementation based on the user's connection type.
    """
    if broker_connection.broker_type == 'METATRADER':
        return MetaTraderAdapter(
            login=broker_connection.mt_login,
            password=broker_connection.api_secret,  # Password is encrypted in storage
            server=broker_connection.mt_server
        )
    else:
        return CCXTAdapter(
            broker_type=broker_connection.broker_type,
            api_key=broker_connection.api_key,
            api_secret=broker_connection.api_secret
        )

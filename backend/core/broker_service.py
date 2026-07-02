"""
Unified Broker Service with pluggable adapters for Forex & Crypto.
"""
import ccxt
from abc import ABC, abstractmethod
from datetime import datetime
import requests
import os
import time


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


class MetaApiAdapter(BaseBrokerAdapter):
    """
    Adapter for MetaTrader 4 and 5 using the MetaApi Cloud REST API.
    Allows connections without needing the MetaTrader terminal running on this machine.
    """
    
    def __init__(self, broker_connection):
        self.connection = broker_connection
        self.token = os.environ.get('META_API_TOKEN', '')
        self.headers = {
            'auth-token': self.token,
            'Content-Type': 'application/json'
        }
        self.base_url = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai'
        self.client_url = 'https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai'

    def connect(self) -> bool:
        if not self.token:
            raise ValueError("META_API_TOKEN is not configured in .env")

        # 1. If we don't have an account ID, provision one
        if not self.connection.mt_account_id:
            payload = {
                'name': self.connection.nickname or f"MT{self.connection.mt_version} Cloud",
                'type': 'cloud',
                'login': self.connection.mt_login,
                'password': self.connection.api_secret,
                'server': self.connection.mt_server,
                'magic': 0,
                'version': int(self.connection.mt_version)
            }
            res = requests.post(f"{self.base_url}/users/current/accounts", json=payload, headers=self.headers)
            if res.status_code not in [200, 201, 202]:
                raise ValueError(f"MetaApi Provisioning Failed: {res.text}")
            
            data = res.json()
            self.connection.mt_account_id = data.get('id') or data.get('_id')
            self.connection.save()

        account_id = self.connection.mt_account_id

        # 2. Deploy the account if not deployed
        res = requests.get(f"{self.base_url}/users/current/accounts/{account_id}", headers=self.headers)
        if res.status_code == 200:
            state = res.json().get('state')
            if state != 'DEPLOYED':
                deploy_res = requests.post(f"{self.base_url}/users/current/accounts/{account_id}/deploy", headers=self.headers)
                if deploy_res.status_code not in [200, 204]:
                    raise ValueError(f"Failed to deploy MetaApi account: {deploy_res.text}")
                time.sleep(3) # Give it a moment to boot
        
        # 3. Test if it's returning balance (Wait for connection)
        for _ in range(5):
            res = requests.get(f"{self.client_url}/users/current/accounts/{account_id}/accountInformation", headers=self.headers)
            if res.status_code == 200:
                return True
            time.sleep(2)
            
        raise ValueError("MetaApi Account failed to connect to broker server in time.")

    def get_balance(self) -> dict:
        if not self.connection.mt_account_id:
            self.connect()
            
        account_id = self.connection.mt_account_id
        res = requests.get(f"{self.client_url}/users/current/accounts/{account_id}/accountInformation", headers=self.headers)
        
        if res.status_code in [404, 503, 500]: # Not connected or booting
            self.connect() # Attempt to wake it up
            res = requests.get(f"{self.client_url}/users/current/accounts/{account_id}/accountInformation", headers=self.headers)
            
        if res.status_code == 200:
            data = res.json()
            return {
                'balance': data.get('balance', 0),
                'equity': data.get('equity', 0),
                'margin': data.get('margin', 0),
                'free_margin': data.get('freeMargin', 0),
                'profit': data.get('profit', 0),
            }
        return {}

    def get_positions(self) -> list:
        if not self.connection.mt_account_id:
            self.connect()
            
        account_id = self.connection.mt_account_id
        res = requests.get(f"{self.client_url}/users/current/accounts/{account_id}/positions", headers=self.headers)
        if res.status_code == 200:
            positions = res.json()
            return [
                {
                    'ticket': p.get('id'),
                    'symbol': p.get('symbol'),
                    'side': 'BUY' if p.get('type') == 'POSITION_TYPE_BUY' else 'SELL',
                    'volume': p.get('volume'),
                    'entry_price': p.get('openPrice'),
                    'current_price': p.get('currentPrice'),
                    'profit': p.get('profit'),
                }
                for p in positions
            ]
        return []

    def get_trade_history(self, since: datetime = None, symbol: str = None) -> list:
        from datetime import datetime, timedelta
        if not self.connection.mt_account_id:
            self.connect()
            
        if since is None:
            since = datetime.now() - timedelta(days=30)
            
        account_id = self.connection.mt_account_id
        start_time = since.strftime('%Y-%m-%d %H:%M:%S.000')
        end_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S.000')
        
        url = f"{self.client_url}/users/current/accounts/{account_id}/history-deals/time/{start_time}/{end_time}"
        res = requests.get(url, headers=self.headers)
        if res.status_code == 200:
            deals = res.json()
            return [
                {
                    'ticket': d.get('id'),
                    'symbol': d.get('symbol', 'UNKNOWN'),
                    'side': 'BUY' if d.get('type') == 'DEAL_TYPE_BUY' else 'SELL',
                    'volume': d.get('volume', 0),
                    'price': d.get('price', 0),
                    'profit': d.get('profit', 0),
                    'commission': d.get('commission', 0),
                    'timestamp': d.get('time'),
                }
                for d in deals if d.get('profit', 0) != 0 # Skip deposits/withdrawals
            ]
        return []


def get_adapter(broker_connection) -> BaseBrokerAdapter:
    """
    Factory function: Returns the correct Adapter implementation based on the user's connection type.
    """
    if broker_connection.broker_type == 'METATRADER_CLOUD':
        return MetaApiAdapter(broker_connection)
    elif broker_connection.broker_type == 'METATRADER':
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

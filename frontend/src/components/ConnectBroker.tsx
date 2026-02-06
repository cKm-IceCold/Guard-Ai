import { useState, useEffect } from 'react';
import { brokerService } from '../services/endpoints';

interface BrokerConnection {
    id: number;
    broker_type: string;
    nickname: string;
    is_active: boolean;
    is_connected: boolean;
    last_synced_at: string | null;
}

const BROKER_OPTIONS = [
    { value: 'BINANCE', label: 'Binance', icon: '💰' },
    { value: 'BYBIT', label: 'Bybit', icon: '🔷' },
    { value: 'KRAKEN', label: 'Kraken', icon: '🐙' },
    { value: 'COINBASE', label: 'Coinbase', icon: '🪙' },
    { value: 'METATRADER', label: 'MetaTrader 5', icon: '📊' },
];

const ConnectBroker = () => {
    // List of existing broker connections for the current user.
    const [connections, setConnections] = useState<BrokerConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // FORM STATE: Used for creating new connections.
    const [brokerType, setBrokerType] = useState('BINANCE');
    const [nickname, setNickname] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [mtServer, setMtServer] = useState('');
    const [mtLogin, setMtLogin] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // INTERACTION STATE: Tracks pending operations for specific connections.
    const [testResult, setTestResult] = useState<any>(null);
    const [testing, setTesting] = useState<number | null>(null);
    const [syncing, setSyncing] = useState<number | null>(null);
    const [syncResult, setSyncResult] = useState<any>(null);

    useEffect(() => {
        loadConnections();
    }, []);

    /**
     * Fetches all registered broker connections from the backend.
     */
    const loadConnections = async () => {
        try {
            const data = await brokerService.list();
            setConnections(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles the submission of the "New Connection" form.
     * Credentials are sent over HTTPS and encrypted on the backend.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            await brokerService.create({
                broker_type: brokerType,
                nickname,
                api_key: apiKey,
                api_secret: apiSecret,
                mt_server: mtServer,
                mt_login: mtLogin,
            });

            setShowForm(false);
            // Reset sensitive form fields.
            setApiKey('');
            setApiSecret('');
            setNickname('');
            loadConnections();
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Failed to save connection');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Performs a live authentication check with the selected broker.
     */
    const handleTest = async (id: number) => {
        setTesting(id);
        setTestResult(null);
        setSyncResult(null);

        try {
            const result = await brokerService.testConnection(id);
            setTestResult({ id, ...result });
        } catch (e: any) {
            setTestResult({ id, status: 'error', message: e.response?.data?.message || 'Connection failed' });
        } finally {
            setTesting(null);
        }
    };

    /**
     * Manual Trigger for the Auto-Sync Engine.
     * Fetches recent closed trades from the broker and populates the Journal.
     */
    const handleSync = async (id: number) => {
        setSyncing(id);
        setSyncResult(null);
        setTestResult(null);

        try {
            const result = await brokerService.syncTrades(id);
            setSyncResult({ id, ...result });
        } catch (e: any) {
            setSyncResult({ id, status: 'error', message: e.response?.data?.error || 'Sync failed' });
        } finally {
            setSyncing(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this broker connection?')) return;

        try {
            await brokerService.delete(id);
            loadConnections();
        } catch (e) {
            console.error(e);
        }
    };

    const isMT = brokerType === 'METATRADER';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-text-main flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">link</span>
                        BROKER CONNECTIONS
                    </h2>
                    <p className="text-text-dim text-sm mt-1">Connect your trading accounts for automatic sync</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary flex items-center gap-2 text-sm"
                >
                    <span className="material-symbols-outlined text-lg">{showForm ? 'close' : 'add'}</span>
                    {showForm ? 'Cancel' : 'Add Connection'}
                </button>
            </header>

            {/* Add Connection Form */}
            {showForm && (
                <div className="glass-card rounded-3xl p-8 animate-in slide-in-from-top-4">
                    <h3 className="text-sm font-black text-text-main uppercase tracking-widest mb-6">New Connection</h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">Broker Type</label>
                                <select
                                    value={brokerType}
                                    onChange={(e) => setBrokerType(e.target.value)}
                                    className="terminal-input w-full"
                                >
                                    {BROKER_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">Nickname (Optional)</label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="terminal-input w-full"
                                    placeholder="e.g., My Spot Account"
                                />
                            </div>
                        </div>

                        {isMT ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">MT5 Server</label>
                                    <input
                                        type="text"
                                        value={mtServer}
                                        onChange={(e) => setMtServer(e.target.value)}
                                        className="terminal-input w-full"
                                        placeholder="e.g., ICMarkets-Demo"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">MT5 Login ID</label>
                                    <input
                                        type="text"
                                        value={mtLogin}
                                        onChange={(e) => setMtLogin(e.target.value)}
                                        className="terminal-input w-full"
                                        placeholder="e.g., 12345678"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">MT5 Password</label>
                                    <input
                                        type="password"
                                        value={apiSecret}
                                        onChange={(e) => setApiSecret(e.target.value)}
                                        className="terminal-input w-full"
                                        placeholder="Your MT5 password"
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">API Key</label>
                                    <input
                                        type="text"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="terminal-input w-full font-mono text-xs"
                                        placeholder="Paste your API key"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">API Secret</label>
                                    <input
                                        type="password"
                                        value={apiSecret}
                                        onChange={(e) => setApiSecret(e.target.value)}
                                        className="terminal-input w-full font-mono text-xs"
                                        placeholder="Paste your API secret"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <p className="text-danger text-[10px] font-black uppercase">{error}</p>
                        )}

                        <div className="flex justify-end gap-4 pt-4 border-t border-border">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 text-text-dim hover:text-text-main transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary px-8 py-2 text-sm"
                            >
                                {saving ? 'Saving...' : 'Connect Account'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Connections List */}
            {loading ? (
                <div className="h-48 flex items-center justify-center">
                    <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : connections.length === 0 ? (
                <div className="glass-card rounded-3xl p-16 text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">account_balance</span>
                    <h3 className="text-lg font-black text-text-main mb-2">No Connections Yet</h3>
                    <p className="text-text-dim text-sm mb-6">Connect your first trading account to enable automatic trade syncing</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Add Your First Broker
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connections.map(conn => (
                        <div key={conn.id} className="glass-card rounded-2xl p-6 relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                                        {BROKER_OPTIONS.find(b => b.value === conn.broker_type)?.icon || '🔗'}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-text-main">{conn.nickname || conn.broker_type}</h4>
                                        <p className="text-[10px] text-text-dim uppercase tracking-widest">
                                            {BROKER_OPTIONS.find(b => b.value === conn.broker_type)?.label}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${conn.is_connected ? 'bg-success/10 text-success' : 'bg-surface border border-border text-text-dim'}`}>
                                    {conn.is_connected ? 'Connected' : 'Inactive'}
                                </div>
                            </div>

                            {testResult && testResult.id === conn.id && (
                                <div className={`p-4 rounded-xl mb-4 text-sm ${testResult.status === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                    <p className="font-bold">{testResult.message}</p>
                                    {testResult.balance && testResult.balance.total && (
                                        <p className="text-xs mt-1 opacity-80">
                                            Balance: {Object.entries(testResult.balance.total).map(([symbol, amt]: any) => amt > 0 ? `${amt} ${symbol} ` : '').join('') || '0.00'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {syncResult && syncResult.id === conn.id && (
                                <div className={`p-4 rounded-xl mb-4 text-sm ${syncResult.status === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                    <p className="font-bold">{syncResult.status === 'success' ? 'Sync Complete' : 'Sync Failed'}</p>
                                    <p className="text-xs mt-1 opacity-80">{syncResult.message}</p>
                                    {syncResult.synced_count > 0 && (
                                        <p className="text-xs font-black mt-1 uppercase text-primary">New Trades Imported: {syncResult.synced_count}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSync(conn.id)}
                                    disabled={syncing === conn.id}
                                    className="flex-1 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <span className={`material-symbols-outlined text-sm ${syncing === conn.id ? 'animate-spin' : ''}`}>sync</span>
                                    {syncing === conn.id ? 'Syncing...' : 'Sync Trades'}
                                </button>
                                <button
                                    onClick={() => handleTest(conn.id)}
                                    disabled={testing === conn.id}
                                    className="flex-1 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all"
                                >
                                    {testing === conn.id ? 'Testing...' : 'Test Auth'}
                                </button>
                                <button
                                    onClick={() => handleDelete(conn.id)}
                                    className="px-4 py-2 bg-danger/10 text-danger rounded-xl text-[10px] font-black uppercase hover:bg-danger hover:text-white transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Card */}
            <div className="glass-card rounded-2xl p-6 border-l-4 border-primary">
                <div className="flex gap-4">
                    <span className="material-symbols-outlined text-primary text-2xl">info</span>
                    <div className="text-sm text-text-dim">
                        <p className="font-bold text-text-main mb-2">Security Note</p>
                        <p>Your API keys are encrypted before storage. For maximum safety, use <span className="text-primary font-bold">Read-Only</span> API keys that don't have trading permissions.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectBroker;

import { useState, useEffect } from 'react';
import { brokerService } from '../services/endpoints';
import { notify } from './NotificationProvider';

interface BrokerConnection {
    id: number;
    broker_type: string;
    nickname: string;
    is_active: boolean;
    is_connected: boolean;
    last_synced_at: string | null;
}

const MT_VERSIONS = [
    { value: 'MT5', label: 'MetaTrader 5', badge: 'Recommended', color: 'text-primary' },
    { value: 'MT4', label: 'MetaTrader 4', badge: 'Legacy', color: 'text-yellow-400' },
];

const ConnectBroker = () => {
    const [connections, setConnections] = useState<BrokerConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [mtVersion, setMtVersion] = useState('MT5');
    const [nickname, setNickname] = useState('');
    const [mtServer, setMtServer] = useState('');
    const [mtLogin, setMtLogin] = useState('');
    const [mtPassword, setMtPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Interaction state
    const [testing, setTesting] = useState<number | null>(null);
    const [syncing, setSyncing] = useState<number | null>(null);
    const [testResult, setTestResult] = useState<any>(null);
    const [syncResult, setSyncResult] = useState<any>(null);

    useEffect(() => { loadConnections(); }, []);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await brokerService.create({
                broker_type: 'METATRADER_CLOUD',
                nickname: nickname || `${mtVersion} — ${mtServer}`,
                api_key: mtLogin,
                api_secret: mtPassword,
                mt_server: mtServer,
                mt_login: mtLogin,
            });
            setShowForm(false);
            setNickname(''); setMtServer(''); setMtLogin(''); setMtPassword('');
            loadConnections();
            notify.success('MT account registered successfully!');
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Failed to save connection. Check your credentials.');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (id: number) => {
        setTesting(id); setTestResult(null); setSyncResult(null);
        try {
            const result = await brokerService.testConnection(id);
            setTestResult({ id, ...result });
        } catch (e: any) {
            setTestResult({ id, status: 'error', message: e.response?.data?.message || 'Connection failed' });
        } finally { setTesting(null); }
    };

    const handleSync = async (id: number) => {
        setSyncing(id); setSyncResult(null); setTestResult(null);
        try {
            const result = await brokerService.syncTrades(id);
            setSyncResult({ id, ...result });
        } catch (e: any) {
            setSyncResult({ id, status: 'error', message: e.response?.data?.error || 'Sync failed' });
        } finally { setSyncing(null); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Remove this MT account connection?')) return;
        try { await brokerService.delete(id); loadConnections(); } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ───────────────────────────────── */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-text-main flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">candlestick_chart</span>
                        MT4 / MT5 CONNECTION
                    </h2>
                    <p className="text-text-dim text-sm mt-1">Link your trading terminal for real-time risk enforcement</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary flex items-center gap-2 text-sm"
                >
                    <span className="material-symbols-outlined text-lg">{showForm ? 'close' : 'add'}</span>
                    {showForm ? 'Cancel' : 'Add MT Account'}
                </button>
            </header>

            {/* ── How it Works ─────────────────────────── */}
            {!showForm && connections.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { step: '01', icon: 'download', title: 'Download the EA', desc: 'Get the Guard AI Expert Advisor from the Risk Guardian tab and install it in your MT4/MT5 terminal.' },
                        { step: '02', icon: 'key', title: 'Enter Your Details', desc: 'Add your MT account number, broker server name, and investor (read-only) password below.' },
                        { step: '03', icon: 'shield', title: 'Guard AI Activates', desc: 'The EA syncs your live equity every 5 seconds. Guard AI auto-locks your terminal if limits are breached.' },
                    ].map(item => (
                        <div key={item.step} className="glass-card p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-4 right-4 text-4xl font-black text-white/5">{item.step}</div>
                            <div className="p-2.5 bg-primary/10 rounded-xl w-fit mb-4">
                                <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                            </div>
                            <h4 className="font-black text-text-main mb-2 text-sm">{item.title}</h4>
                            <p className="text-text-dim text-xs leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Add Connection Form ───────────────────── */}
            {showForm && (
                <div className="glass-card rounded-3xl p-8 animate-in slide-in-from-top-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-400"></div>
                    <h3 className="text-sm font-black text-text-main uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">add_circle</span>
                        Register MT Account
                    </h3>

                    {/* MT Version Selector */}
                    <div className="flex gap-3 mb-6">
                        {MT_VERSIONS.map(v => (
                            <button
                                key={v.value}
                                type="button"
                                onClick={() => setMtVersion(v.value)}
                                className={`flex-1 py-3 px-4 rounded-2xl border text-sm font-bold transition-all ${
                                    mtVersion === v.value
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-white/[0.02] text-text-dim hover:border-border/70'
                                }`}
                            >
                                <span className="block font-black">{v.label}</span>
                                <span className={`text-[10px] uppercase tracking-widest ${mtVersion === v.value ? v.color : 'text-text-dim'}`}>{v.badge}</span>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">
                                    Broker Server Name
                                </label>
                                <input
                                    type="text"
                                    value={mtServer}
                                    onChange={e => setMtServer(e.target.value)}
                                    className="terminal-input w-full"
                                    placeholder="e.g. ICMarkets-Demo01"
                                    required
                                />
                                <p className="text-[10px] text-text-dim mt-1">Found in MT login screen under "Server"</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">
                                    Account Number (Login)
                                </label>
                                <input
                                    type="text"
                                    value={mtLogin}
                                    onChange={e => setMtLogin(e.target.value)}
                                    className="terminal-input w-full font-mono"
                                    placeholder="e.g. 12345678"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">
                                    Investor Password <span className="text-success">(Read-Only)</span>
                                </label>
                                <input
                                    type="password"
                                    value={mtPassword}
                                    onChange={e => setMtPassword(e.target.value)}
                                    className="terminal-input w-full"
                                    placeholder="Your read-only investor password"
                                    required
                                />
                                <p className="text-[10px] text-text-dim mt-1">NOT your main password — use Investor password only</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">
                                    Nickname (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                    className="terminal-input w-full"
                                    placeholder="e.g. My FTMO Challenge"
                                />
                            </div>
                        </div>

                        {/* Security callout */}
                        <div className="flex gap-3 p-4 bg-success/5 border border-success/20 rounded-xl">
                            <span className="material-symbols-outlined text-success text-xl flex-shrink-0">lock</span>
                            <p className="text-xs text-text-dim leading-relaxed">
                                <span className="text-success font-bold">Investor password is read-only.</span> Guard AI can only observe your account — it cannot place or modify trades through this connection. The EA bridge handles enforcement locally inside your terminal.
                            </p>
                        </div>

                        {error && <p className="text-danger text-[10px] font-black uppercase">{error}</p>}

                        <div className="flex justify-end gap-4 pt-4 border-t border-border">
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-text-dim hover:text-text-main transition-colors text-sm">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="btn-primary px-8 py-2 text-sm">
                                {saving ? 'Connecting...' : `Connect ${mtVersion} Account`}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Connections List ──────────────────────── */}
            {loading ? (
                <div className="h-48 flex items-center justify-center">
                    <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : connections.length === 0 && !showForm ? (
                <div className="glass-card rounded-3xl p-16 text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-700 mb-4 block">candlestick_chart</span>
                    <h3 className="text-lg font-black text-text-main mb-2">No MT Accounts Connected</h3>
                    <p className="text-text-dim text-sm mb-6">Add your MetaTrader account to enable live risk monitoring and automatic lockout enforcement</p>
                    <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
                        <span className="material-symbols-outlined">add</span>
                        Connect MT4 / MT5 Account
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connections.map(conn => (
                        <div key={conn.id} className="glass-card rounded-2xl p-6 relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary">candlestick_chart</span>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-text-main">{conn.nickname || conn.broker_type}</h4>
                                        <p className="text-[10px] text-text-dim uppercase tracking-widest">MetaTrader Account</p>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${conn.is_connected ? 'bg-success/10 text-success' : 'bg-surface border border-border text-text-dim'}`}>
                                    {conn.is_connected ? '● Live' : '○ Inactive'}
                                </div>
                            </div>

                            {conn.last_synced_at && (
                                <p className="text-[10px] text-text-dim mb-3">
                                    Last sync: {new Date(conn.last_synced_at).toLocaleString()}
                                </p>
                            )}

                            {testResult && testResult.id === conn.id && (
                                <div className={`p-3 rounded-xl mb-4 text-sm ${testResult.status === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                                    <p className="font-bold text-xs">{testResult.message}</p>
                                </div>
                            )}
                            {syncResult && syncResult.id === conn.id && (
                                <div className={`p-3 rounded-xl mb-4 text-sm ${syncResult.status !== 'error' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                                    <p className="font-bold text-xs">{syncResult.status !== 'error' ? `Sync complete — ${syncResult.synced_count || 0} trades imported` : syncResult.message}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={() => handleSync(conn.id)} disabled={syncing === conn.id}
                                    className="flex-1 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2">
                                    <span className={`material-symbols-outlined text-sm ${syncing === conn.id ? 'animate-spin' : ''}`}>sync</span>
                                    {syncing === conn.id ? 'Syncing...' : 'Sync Trades'}
                                </button>
                                <button onClick={() => handleTest(conn.id)} disabled={testing === conn.id}
                                    className="flex-1 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all">
                                    {testing === conn.id ? 'Testing...' : 'Test Auth'}
                                </button>
                                <button onClick={() => handleDelete(conn.id)}
                                    className="px-4 py-2 bg-danger/10 text-danger rounded-xl text-[10px] font-black uppercase hover:bg-danger hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConnectBroker;

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { journalService, riskService } from '../services/endpoints';
import { notify } from './NotificationProvider';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Ticker {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
}

interface RecentTrade {
    id: number;
    result: string;
    pnl: number;
    created_at: string;
    symbol?: string;
}

interface BehaviorAlert {
    type: 'danger' | 'warning' | 'success';
    icon: string;
    title: string;
    message: string;
}

// ─── Lock Countdown Timer ──────────────────────────────────────────────────
const LockCountdown = ({ lockedAt, onComplete }: { lockedAt: string, onComplete: () => void }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    useEffect(() => {
        const calculateTime = () => {
            const diff = (new Date(lockedAt).getTime() + 12 * 3600000) - Date.now();
            if (diff <= 0) { onComplete(); return '00:00:00'; }
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
        };
        const timer = setInterval(() => setTimeLeft(calculateTime()), 1000);
        setTimeLeft(calculateTime());
        return () => clearInterval(timer);
    }, [lockedAt, onComplete]);
    return <p className="text-xl font-mono font-bold text-danger">{timeLeft}</p>;
};

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
};

// ─── Discipline Ring Gauge ─────────────────────────────────────────────────
const DisciplineRing = ({ score }: { score: number }) => {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const filled = circumference - (score / 100) * circumference;
    const color = score >= 75 ? '#4ade80' : score >= 50 ? '#f59e0b' : '#ef4444';
    const label = score >= 75 ? 'Elite' : score >= 50 ? 'Developing' : 'At Risk';

    return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                    <circle
                        cx="60" cy="60" r={radius} fill="none"
                        stroke={color} strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={filled}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 8px ${color}80)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-mono font-black" style={{ color }}>{score}</span>
                    <span className="text-[9px] text-text-dim uppercase font-bold tracking-widest">/ 100</span>
                </div>
            </div>
            <div>
                <p className="text-center text-[10px] text-text-dim uppercase font-bold tracking-widest">Discipline Index</p>
                <p className="text-center text-xs font-bold mt-0.5" style={{ color }}>{label}</p>
            </div>
        </div>
    );
};

// ─── Pre-Trade Checklist Modal ─────────────────────────────────────────────
const DEFAULT_CHECKLIST = [
    'The market trend aligns with my strategy direction',
    'My Stop Loss level is clearly defined before entering',
    'My position size risks less than 2% of my account',
    'I have a defined Take Profit target with at least 1:1.5 R:R',
    'I am not trading out of boredom, revenge, or emotion',
];

const PreTradeChecklist = ({ onClose }: { onClose: () => void }) => {
    const [checked, setChecked] = useState<boolean[]>(new Array(DEFAULT_CHECKLIST.length).fill(false));
    const allChecked = checked.every(Boolean);

    const toggle = (i: number) => {
        const next = [...checked];
        next[i] = !next[i];
        setChecked(next);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-surface border border-border rounded-3xl p-8 w-full max-w-lg shadow-2xl relative overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-400"></div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <span className="material-symbols-outlined text-primary">checklist</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text-main">Pre-Trade Checklist</h3>
                        <p className="text-[11px] text-text-dim">Confirm all rules before executing</p>
                    </div>
                </div>

                <div className="space-y-3 mb-8">
                    {DEFAULT_CHECKLIST.map((item, i) => (
                        <button
                            key={i}
                            onClick={() => toggle(i)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
                                checked[i]
                                    ? 'border-success/40 bg-success/5 text-text-main'
                                    : 'border-border bg-white/[0.02] text-text-dim hover:border-border/80 hover:bg-white/[0.03]'
                            }`}
                        >
                            <div className={`flex-shrink-0 size-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                checked[i] ? 'border-success bg-success' : 'border-border'
                            }`}>
                                {checked[i] && <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>}
                            </div>
                            <span className="text-sm leading-snug">{item}</span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-[11px] font-bold uppercase tracking-widest text-text-dim border border-border rounded-xl hover:text-text-main transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (!allChecked) {
                                notify.error('Complete all checklist items before proceeding.');
                                return;
                            }
                            notify.success('All rules confirmed. Trade with discipline.');
                            onClose();
                        }}
                        className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
                            allChecked
                                ? 'bg-success text-white shadow-[0_0_20px_rgba(74,222,128,0.3)]'
                                : 'bg-white/5 text-text-dim cursor-not-allowed'
                        }`}
                    >
                        {allChecked ? '✓ Clear to Trade' : `${checked.filter(Boolean).length}/${DEFAULT_CHECKLIST.length} Confirmed`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Alert Color Map ───────────────────────────────────────────────────────
const alertStyles = {
    danger: { border: 'border-danger/30', bg: 'bg-danger/5', icon: 'text-danger', badge: 'bg-danger/10 text-danger' },
    warning: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', icon: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400' },
    success: { border: 'border-success/30', bg: 'bg-success/5', icon: 'text-success', badge: 'bg-success/10 text-success' },
};

// ─── Main Dashboard ────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user } = useAuthStore();
    const [prices, setPrices] = useState<Ticker[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [riskProfile, setRiskProfile] = useState<any>(null);
    const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
    const [behaviorAlerts, setBehaviorAlerts] = useState<BehaviorAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showChecklist, setShowChecklist] = useState(false);
    const [disciplineScore, setDisciplineScore] = useState(0);

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsData, riskData, tradesData, alertsData] = await Promise.all([
                journalService.getStats(),
                riskService.getProfile(),
                journalService.listTrades(),
                journalService.getBehaviorAlerts().catch(() => ({ alerts: [] })),
            ]);
            setStats(statsData);
            setRiskProfile(riskData);
            setRecentTrades(Array.isArray(tradesData) ? tradesData.slice(0, 5) : []);
            setBehaviorAlerts(alertsData?.alerts || []);

            // Calculate composite Discipline Index
            const wr = statsData?.win_rate || 0;
            const dr = statsData?.discipline_rate || 0;
            const dd = statsData?.max_drawdown || 0;
            const drawdownHealth = Math.max(0, 100 - (dd / Math.max(riskData?.max_daily_loss || 200, 1)) * 100);
            const score = Math.round((wr * 0.3) + (dr * 0.5) + (drawdownHealth * 0.2));
            setDisciplineScore(Math.min(score, 100));
        } catch (error) {
            console.error(error);
            notify.error('Backend unreachable. Is your local server running?');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();

        setPrices([
            { symbol: 'BTC-USD', lastPrice: '...', priceChangePercent: '0.00' },
            { symbol: 'ETH-USD', lastPrice: '...', priceChangePercent: '0.00' },
            { symbol: 'SOL-USD', lastPrice: '...', priceChangePercent: '0.00' },
            { symbol: 'EUR-USD', lastPrice: '...', priceChangePercent: '0.00' },
        ]);

        const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker/ethusdt@ticker/solusdt@ticker/eurusdt@ticker');
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const symbolMap: Record<string, string> = {
                    BTCUSDT: 'BTC-USD', ETHUSDT: 'ETH-USD',
                    SOLUSDT: 'SOL-USD', EURUSDT: 'EUR-USD',
                };
                const mappedSymbol = symbolMap[data.s];
                if (!mappedSymbol) return;
                setPrices(prev => {
                    const next = [...prev];
                    const idx = next.findIndex(p => p.symbol === mappedSymbol);
                    const updated = {
                        symbol: mappedSymbol,
                        lastPrice: parseFloat(data.c).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }),
                        priceChangePercent: parseFloat(data.P).toFixed(2),
                    };
                    if (idx >= 0) next[idx] = updated; else next.push(updated);
                    return next;
                });
            } catch (e) { /* silent */ }
        };
        return () => ws.close();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    const lossPercent = riskProfile
        ? Math.min((parseFloat(riskProfile.current_daily_loss) / parseFloat(riskProfile.max_daily_loss)) * 100, 100)
        : 0;

    return (
        <div className="space-y-6">

            {/* Pre-Trade Checklist Modal */}
            {showChecklist && <PreTradeChecklist onClose={() => setShowChecklist(false)} />}

            {/* ── Welcome Header ─────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-text-main tracking-tight">
                        {getGreeting()}, <span className="text-primary">{user?.username || 'Trader'}</span>
                    </h1>
                    <p className="text-text-dim text-sm mt-1">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Pre-Trade Checklist Button */}
                    <button
                        onClick={() => setShowChecklist(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">checklist</span>
                        Pre-Trade Check
                    </button>
                    <div className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest ${riskProfile?.is_locked ? 'border-danger text-danger bg-danger/5' : 'border-success text-success bg-success/5'}`}>
                        {riskProfile?.is_locked ? '🔒 Locked' : '✓ Ready'}
                    </div>
                </div>
            </div>

            {/* ── Live Price Ticker ──────────────────────────────── */}
            {prices.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-3 overflow-hidden">
                    <div className="flex gap-8 animate-marquee whitespace-nowrap">
                        {[...prices, ...prices].map((p, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <span className="text-text-dim font-mono text-xs uppercase">{p.symbol}</span>
                                <span className="font-bold font-mono text-text-main text-sm">{p.lastPrice}</span>
                                <span className={`text-xs font-bold ${parseFloat(p.priceChangePercent) >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {parseFloat(p.priceChangePercent) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(p.priceChangePercent)).toFixed(2)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Live Behavior Alerts ───────────────────────────── */}
            {behaviorAlerts.length > 0 && (
                <div className="space-y-3">
                    <p className="text-[10px] text-text-dim uppercase font-black tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">monitoring</span>
                        Live Behavior Analysis
                    </p>
                    {behaviorAlerts.map((alert, i) => {
                        const s = alertStyles[alert.type] || alertStyles.success;
                        return (
                            <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border ${s.border} ${s.bg} animate-in slide-in-from-left-4 duration-500`} style={{ animationDelay: `${i * 100}ms` }}>
                                <div className={`p-2 rounded-xl ${s.badge} flex-shrink-0`}>
                                    <span className="material-symbols-outlined text-lg">{alert.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-black uppercase tracking-widest mb-1 ${s.icon}`}>{alert.title}</p>
                                    <p className="text-text-dim text-xs leading-relaxed">{alert.message}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Core Metrics Grid ──────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Discipline Ring */}
                <div className="lg:col-span-1 glass-card p-6">
                    <DisciplineRing score={disciplineScore} />
                </div>

                {/* Stats Cards */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-6 flex flex-col justify-between">
                        <p className="text-secondary-text uppercase tracking-widest text-[10px] font-bold">Win Rate</p>
                        <p className="text-4xl font-mono font-black border-l-4 border-success pl-4 leading-none">{stats?.win_rate || 0}%</p>
                        <p className="text-secondary-text text-[10px] mt-2 italic">Based on {stats?.total_trades || 0} verified entries</p>
                    </div>
                    <div className="glass-card p-6 flex flex-col justify-between">
                        <p className="text-secondary-text uppercase tracking-widest text-[10px] font-bold">Total Gain</p>
                        <p className={`text-4xl font-mono font-black border-l-4 pl-4 leading-none ${(stats?.total_pnl || 0) >= 0 ? 'border-success text-success' : 'border-danger text-danger'}`}>
                            ${(stats?.total_pnl || 0).toLocaleString()}
                        </p>
                        <p className="text-secondary-text text-[10px] mt-2 italic">Net profit after commissions</p>
                    </div>
                    <div className="glass-card p-6 flex flex-col justify-between">
                        <p className="text-secondary-text uppercase tracking-widest text-[10px] font-bold">Discipline Score</p>
                        <p className="text-4xl font-mono font-black border-l-4 border-primary pl-4 leading-none">{stats?.discipline_rate || 0}%</p>
                        <p className="text-secondary-text text-[10px] mt-2 italic">Following your trading plan</p>
                    </div>
                </div>
            </div>

            {/* ── Daily Risk Meter ───────────────────────────────── */}
            <div className="glass-card p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                        <p className="text-[10px] uppercase font-black text-text-dim tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-danger">shield</span>
                            Daily Risk Meter
                        </p>
                        <p className="text-xs text-text-dim mt-0.5">
                            {riskProfile?.is_locked
                                ? <span className="text-danger font-bold">🔒 Terminal Locked — {riskProfile.lock_reason}</span>
                                : 'Capital protection is active'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] text-text-dim uppercase font-bold">Daily Loss</p>
                            <p className={`text-xl font-mono font-black ${lossPercent > 80 ? 'text-danger' : 'text-text-main'}`}>
                                ${parseFloat(riskProfile?.current_daily_loss || '0').toFixed(2)}
                                <span className="text-text-dim text-sm font-normal"> / ${parseFloat(riskProfile?.max_daily_loss || '200').toFixed(0)}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-text-dim uppercase font-bold">Trades Today</p>
                            <p className="text-xl font-mono font-black text-text-main">
                                {riskProfile?.trades_today || 0}
                                <span className="text-text-dim text-sm font-normal"> / {riskProfile?.max_trades_per_day || 5}</span>
                            </p>
                        </div>
                        {riskProfile?.is_locked && riskProfile?.locked_at && (
                            <div className="text-right">
                                <p className="text-[10px] text-text-dim uppercase font-bold">Unlocks In</p>
                                <LockCountdown lockedAt={riskProfile.locked_at} onComplete={refreshData} />
                            </div>
                        )}
                    </div>
                </div>
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            riskProfile?.is_locked ? 'bg-danger' : lossPercent > 80 ? 'bg-orange-500' : 'bg-primary'
                        } shadow-[0_0_10px_rgba(59,130,246,0.4)]`}
                        style={{ width: `${lossPercent}%` }}
                    />
                </div>
            </div>

            {/* ── Advanced Metrics ───────────────────────────────── */}
            {stats && stats.total_trades > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                        { label: 'Profit Factor', val: stats.profit_factor || '—', color: (stats.profit_factor || 0) >= 1.5 ? 'text-success' : (stats.profit_factor || 0) >= 1 ? 'text-yellow-400' : 'text-danger' },
                        { label: 'Avg R:R', val: stats.avg_rr || '—', color: 'text-primary' },
                        { label: 'Max Drawdown', val: stats.max_drawdown ? `-$${stats.max_drawdown}` : '—', color: 'text-danger' },
                        { label: 'Best Trade', val: stats.best_trade ? `+$${stats.best_trade}` : '—', color: 'text-success' },
                        { label: 'Worst Trade', val: stats.worst_trade ? `-$${Math.abs(stats.worst_trade)}` : '—', color: 'text-danger' },
                        { label: 'Win Streak', val: `🔥 ${stats.max_win_streak || 0}`, color: 'text-success' },
                        { label: 'Loss Streak', val: `❄️ ${stats.max_loss_streak || 0}`, color: 'text-danger' },
                    ].map((m, i) => (
                        <div key={i} className="glass-card p-4 text-center">
                            <p className="text-secondary-text uppercase tracking-widest text-[9px] font-bold mb-2">{m.label}</p>
                            <p className={`text-2xl font-mono font-black ${m.color}`}>{m.val}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Recent Activity + Equity Curve ────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Trades */}
                <div className="glass-card p-6">
                    <h3 className="text-secondary-text uppercase tracking-widest text-xs font-bold font-mono mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">history</span>
                        Recent Activity
                    </h3>
                    {recentTrades.length === 0 ? (
                        <div className="text-center py-8 space-y-2">
                            <span className="material-symbols-outlined text-text-dim text-4xl">receipt_long</span>
                            <p className="text-text-dim text-sm">No trades yet. Start logging!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentTrades.map(trade => (
                                <div key={trade.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-8 rounded-lg flex items-center justify-center ${trade.result === 'WIN' ? 'bg-success/20 text-success' : trade.result === 'LOSS' ? 'bg-danger/20 text-danger' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                            <span className="material-symbols-outlined text-sm">
                                                {trade.result === 'WIN' ? 'trending_up' : trade.result === 'LOSS' ? 'trending_down' : 'trending_flat'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-text-main text-xs font-bold">{trade.symbol || 'Trade'}</p>
                                            <p className="text-text-dim text-[10px]">{new Date(trade.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <p className={`font-mono font-bold text-sm ${(trade.pnl || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {(trade.pnl || 0) >= 0 ? '+' : ''}{trade.pnl || 0}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Equity Curve */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-secondary-text uppercase tracking-widest text-xs font-bold font-mono flex items-center gap-2">
                            <span className="material-symbols-outlined text-success text-lg">show_chart</span>
                            Equity Curve
                        </h3>
                        <button
                            onClick={refreshData}
                            className="flex items-center gap-1 text-[10px] text-text-dim hover:text-text-main transition-colors uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-sm">refresh</span>
                            Refresh
                        </button>
                    </div>
                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.daily_pnl || []}>
                                <defs>
                                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                                <XAxis dataKey="date" stroke="var(--text-dim)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis stroke="var(--text-dim)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#4ade80', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="pnl" stroke="#4ade80" strokeWidth={3} fillOpacity={1} fill="url(#colorPnl)" animationDuration={2000} />
                            </AreaChart>
                        </ResponsiveContainer>
                        {(!stats?.daily_pnl || stats.daily_pnl.length === 0) && (
                            <div className="flex flex-col items-center justify-center h-full -mt-16 gap-2">
                                <span className="material-symbols-outlined text-text-dim text-4xl">area_chart</span>
                                <p className="text-text-dim text-xs">Log trades to generate your equity curve</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { journalService, riskService, priceService } from '../services/endpoints';
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

/**
 * LockCountdown: A specialized timer component.
 */
const LockCountdown = ({ lockedAt, onComplete }: { lockedAt: string, onComplete: () => void }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const calculateTime = () => {
            const lockTime = new Date(lockedAt).getTime();
            const unlockTime = lockTime + (12 * 60 * 60 * 1000);
            const now = new Date().getTime();
            const diff = unlockTime - now;

            if (diff <= 0) {
                onComplete();
                return '00:00:00';
            }

            const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');

            return `${h}:${m}:${s}`;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTime());
        }, 1000);

        setTimeLeft(calculateTime());
        return () => clearInterval(timer);
    }, [lockedAt, onComplete]);

    return (
        <p className="text-xl font-mono font-bold text-danger group-hover:scale-110 transition-transform">{timeLeft}</p>
    );
};

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
};

const Dashboard = () => {
    const { user } = useAuthStore();
    const [prices, setPrices] = useState<Ticker[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [riskProfile, setRiskProfile] = useState<any>(null);
    const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        refreshData();
        fetchPrices();
        const priceInterval = setInterval(fetchPrices, 30000);
        return () => clearInterval(priceInterval);
    }, []);

    const fetchPrices = async () => {
        try {
            const data = await priceService.getPrices();
            if (Array.isArray(data)) {
                setPrices(data);
            }
        } catch (e) {
            console.error("Price fetch error", e);
        }
    };

    const refreshData = async () => {
        setLoading(true);
        try {
            const [statsData, riskData, tradesData] = await Promise.all([
                journalService.getStats(),
                riskService.getProfile(),
                journalService.listTrades()
            ]);
            setStats(statsData);
            setRiskProfile(riskData);
            // Get last 5 trades
            setRecentTrades(Array.isArray(tradesData) ? tradesData.slice(0, 5) : []);
        } catch (error) {
            console.error(error);
            notify.error("Intelligence failure: Backend is unreachable.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
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
                    <div className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest ${riskProfile?.is_locked ? 'border-danger text-danger bg-danger/5' : 'border-success text-success bg-success/5'}`}>
                        {riskProfile?.is_locked ? '🔒 Locked' : '✓ Ready'}
                    </div>
                </div>
            </div>

            {/* Real-time Ticker Bar */}
            {prices.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-3 overflow-hidden">
                    <div className="flex gap-8 animate-marquee whitespace-nowrap">
                        {prices.map((p, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <span className="text-text-dim font-mono text-xs uppercase">{p.symbol}</span>
                                <span className="font-bold font-mono text-text-main text-sm">{p.lastPrice}</span>
                                <span className={`text-xs font-bold ${parseFloat(p.priceChangePercent) >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {parseFloat(p.priceChangePercent) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(p.priceChangePercent)).toFixed(2)}%
                                </span>
                            </div>
                        ))}
                        {/* Duplicate for seamless scroll */}
                        {prices.map((p, i) => (
                            <div key={`dup-${i}`} className="flex gap-2 items-center">
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Risk Guardian Status */}
                <div className="lg:col-span-1 glass-card p-6 group">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-secondary-text uppercase tracking-widest text-xs font-bold">Risk Guardian</h3>
                        <div className={`size-3 rounded-full ${riskProfile?.is_locked ? 'bg-danger animate-pulse' : 'bg-success shadow-[0_0_10px_#4ade80]'}`}></div>
                    </div>

                    {riskProfile?.is_locked ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-danger/10 border border-danger/20 rounded">
                                <p className="text-danger text-xs uppercase font-bold mb-1">System Lockdown</p>
                                <p className="text-secondary-text text-[10px] leading-tight">{riskProfile.lock_reason}</p>
                            </div>
                            <div>
                                <p className="text-secondary-text text-[10px] uppercase font-bold mb-1">Unlocks in:</p>
                                <LockCountdown lockedAt={riskProfile.locked_at} onComplete={refreshData} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-success/10 border border-success/20 rounded">
                                <p className="text-success text-xs uppercase font-bold mb-1">Operational</p>
                                <p className="text-secondary-text text-[10px] leading-tight">All systems green. Risk limits within baseline.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-secondary-text text-[10px] uppercase font-bold mb-1">Daily Trades</p>
                                    <p className="text-xl font-mono font-bold text-success">{riskProfile?.trades_today}/{riskProfile?.max_trades_daily}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-secondary-text text-[10px] uppercase font-bold mb-1">P&L Status</p>
                                    <p className={`text-xl font-mono font-bold ${riskProfile?.current_daily_pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {riskProfile?.current_daily_pnl >= 0 ? '+' : ''}{riskProfile?.current_daily_pnl}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Key Metrics Grid */}
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

            {/* Recent Activity & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Trades */}
                <div className="glass-card p-6">
                    <h3 className="text-secondary-text uppercase tracking-widest text-xs font-bold font-mono mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">history</span>
                        Recent Activity
                    </h3>
                    {recentTrades.length === 0 ? (
                        <p className="text-text-dim text-sm text-center py-8">No trades yet. Start logging!</p>
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

                {/* Performance Visualization */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-secondary-text uppercase tracking-widest text-xs font-bold font-mono flex items-center gap-2">
                            <span className="material-symbols-outlined text-success text-lg">show_chart</span>
                            Equity Curve
                        </h3>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.daily_pnl || []}>
                                <defs>
                                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--text-dim)"
                                    tick={{ fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="var(--text-dim)"
                                    tick={{ fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#4ade80', fontSize: '12px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="pnl"
                                    stroke="#4ade80"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorPnl)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { journalService, riskService, priceService } from '../services/endpoints';

interface Ticker {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
}

/**
 * LockCountdown: A specialized timer component.
 * Displays the remaining time until the terminal is "unlocked" after a risk violation.
 */
const LockCountdown = ({ lockedAt, onComplete }: { lockedAt: string, onComplete: () => void }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const calculateTime = () => {
            const lockTime = new Date(lockedAt).getTime();
            // Lock duration is exactly 12 hours from the moment of violation.
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

const Dashboard = () => {
    const { user } = useAuth();
    // Ticker data for the top scrolling price bar.
    const [prices, setPrices] = useState<Ticker[]>([]);
    // Aggregated performance statistics (Journal).
    const [stats, setStats] = useState<any>(null);
    // Real-time risk limits and current session P&L.
    const [riskProfile, setRiskProfile] = useState<any>(null);

    // LIVE PRICE FEED: Fetches major asset prices from our proxy backend every 5 seconds.
    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const data = await priceService.getPrices();
                setPrices(data);
            } catch (e) {
                console.error("Price fetch error:", e);
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 5000);
        return () => clearInterval(interval);
    }, []);

    /**
     * CORE DATA HYDRATION:
     * Pulls the user's risk profile and performance stats from the API.
     */
    const fetchData = async () => {
        try {
            const [statsData, riskData] = await Promise.all([
                journalService.getStats(),
                riskService.getProfile()
            ]);
            setStats(statsData);
            setRiskProfile(riskData);
        } catch (e) {
            console.error(e);
        }
    };

    // Fetch personalized stats and risk profile
    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-4xl">grid_view</span>
                        TRADING DASHBOARD
                    </h2>
                    <p className="text-slate-500 font-mono text-sm mt-1 uppercase tracking-widest">
                        Welcome back, <span className="text-primary font-bold">{user?.email?.split('@')[0] || 'Trader'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono bg-surface border border-border px-4 py-2 rounded-full shadow-lg">
                    <div className={`size-2 rounded-full ${riskProfile?.is_locked ? 'bg-danger' : 'bg-success'} animate-pulse`}></div>
                    <span className="text-slate-400 uppercase font-black text-[9px] tracking-widest">{riskProfile?.is_locked ? 'ACCOUNT LOCKED' : 'SYSTEM CONNECTED'}</span>
                </div>
            </header>

            {/* Live Ticker Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {prices.length > 0 ? (
                    prices.map(m => (
                        <div key={m.symbol} className="p-5 glass-card rounded-2xl shadow-xl hover:border-primary/50 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <span className="material-symbols-outlined text-4xl transform rotate-45">bolt</span>
                            </div>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-black text-white group-hover:text-primary transition-colors tracking-tighter uppercase">{m.symbol.replace('USDT', '')}/USDT</h3>
                                    <p className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${parseFloat(m.priceChangePercent) >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                        {parseFloat(m.priceChangePercent) >= 0 ? '+' : ''}{m.priceChangePercent}%
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-slate-700 text-lg">trending_up</span>
                            </div>
                            <p className="font-mono text-xl text-slate-100 font-bold self-end leading-none">
                                ${parseFloat(m.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full h-24 flex items-center justify-center text-slate-700 font-mono animate-pulse uppercase text-xs tracking-widest">
                        Initializing Encrypted Feeds...
                    </div>
                )}
            </div>

            {/* Personalized Stats Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 opacity-[0.02] -translate-y-1/4 translate-x-1/4">
                        <span className="material-symbols-outlined text-[300px]">shield</span>
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                YOUR PERFORMANCE
                            </h3>
                            <div className="text-right">
                                <div className={`text-[10px] mb-1 font-bold ${riskProfile?.is_locked ? 'text-danger' : 'text-success'}`}>
                                    {riskProfile?.is_locked ? 'TRADING LOCKED' : 'TRADING ACTIVE'}
                                </div>
                                <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${riskProfile?.is_locked ? 'bg-danger w-full' : 'bg-success w-1/3'}`}></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Win Rate</p>
                                <p className="text-3xl md:text-4xl font-mono font-black text-white leading-none">{stats?.win_rate || '0.0'}%</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Discipline</p>
                                <p className="text-3xl md:text-4xl font-mono font-black text-primary leading-none">{stats?.discipline_rate || '0.0'}%</p>
                            </div>
                            <div className="sm:col-span-2 md:col-span-1">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Total Profit</p>
                                <p className={`text-3xl md:text-4xl font-mono font-black leading-none ${parseFloat(stats?.total_pnl || '0') >= 0 ? 'text-success' : 'text-danger'}`}>
                                    ${stats?.total_pnl || '0.00'}
                                </p>
                            </div>
                        </div>

                        {(!stats || stats.total_trades === 0) && (
                            <div className="mt-12 flex justify-center">
                                <button
                                    onClick={async () => {
                                        await journalService.populateDemo();
                                        fetchData();
                                    }}
                                    className="px-8 py-3 bg-primary/10 border border-primary/20 text-primary rounded-2xl text-[10px] font-black hover:bg-primary hover:text-white transition-all shadow-xl shadow-primary/5 active:scale-95"
                                >
                                    LOAD EXAMPLE DATA
                                </button>
                            </div>
                        )}

                        <div className="mt-12 pt-8 border-t border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 bg-slate-900/50 h-2 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                        style={{ width: `${stats?.discipline_rate || 0}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] font-mono text-slate-600 uppercase font-black tracking-widest">Psychology Integrity</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Active Rules */}
                <div className="glass-card rounded-3xl p-8 flex flex-col shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <span className="material-symbols-outlined text-6xl">gite</span>
                    </div>

                    <h3 className="text-[10px] font-black text-white mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-500 text-sm">security</span>
                        Your Risk Rules
                    </h3>

                    <div className="space-y-4 flex-1">
                        {riskProfile?.is_locked && riskProfile?.locked_at ? (
                            <div className="p-6 bg-danger/5 border border-danger/20 rounded-2xl flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                                <span className="material-symbols-outlined text-danger mb-2 text-3xl">lock_clock</span>
                                <p className="text-[10px] text-danger font-black uppercase tracking-widest mb-2">Cooling Down</p>
                                <LockCountdown lockedAt={riskProfile.locked_at} onComplete={fetchData} />
                            </div>
                        ) : (
                            <div className="p-6 bg-success/5 border border-success/20 rounded-2xl flex flex-col items-center justify-center text-center">
                                <span className="material-symbols-outlined text-success mb-2 text-3xl">verified_user</span>
                                <p className="text-[10px] text-success font-black uppercase tracking-widest">Rules Active</p>
                                <p className="text-xl font-mono font-black text-white mt-1">SECURED</p>
                            </div>
                        )}

                        <div className="p-4 bg-[#050507] border border-border rounded-2xl">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Max Daily Loss</p>
                            <p className="text-xl font-mono font-bold text-white">${riskProfile?.max_daily_loss || '0.00'}</p>
                        </div>
                        <div className="p-4 bg-[#050507] border border-border rounded-2xl">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Daily Trade Cap</p>
                            <p className="text-xl font-mono font-bold text-white">{riskProfile?.max_trades_per_day || '0'} Trades</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border">
                        <p className="text-[9px] text-slate-600 font-serif italic text-center px-4 leading-relaxed opacity-60">
                            "The market is a device for transferring money from the impatient to the patient."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

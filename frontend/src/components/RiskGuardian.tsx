import { useState, useEffect } from 'react';
import { riskService, journalService } from '../services/endpoints';

const LockCountdown = ({ lockedAt, onComplete }: { lockedAt: string, onComplete: () => void }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const calculateTime = () => {
            const lockTime = new Date(lockedAt).getTime();
            const unlockTime = lockTime + (12 * 60 * 60 * 1000); // +12 hours
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
        <div className="flex flex-col items-end">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Unlocks In</p>
            <p className="text-2xl font-mono font-black text-white group-hover:text-danger transition-colors">{timeLeft}</p>
        </div>
    );
};

const RiskGuardian = () => {
    // RISK PROFILE: Tracks current daily loss, trade count, and lock status.
    const [profile, setProfile] = useState<any>(null);
    // Performance stats from the Journal (Win Rate, Discipline).
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // SETTINGS STATE: For adjusting risk limits.
    const [showSettings, setShowSettings] = useState(false);
    const [newMaxLoss, setNewMaxLoss] = useState('');
    const [newMaxTrades, setNewMaxTrades] = useState('');
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState('');

    /**
     * Refreshes the risk profile and stats from the API.
     * Invoked on mount and after settings updates.
     */
    const refreshData = async () => {
        try {
            const [riskProfile, journalStats] = await Promise.all([
                riskService.getProfile(),
                journalService.getStats()
            ]);
            setProfile(riskProfile);
            setStats(journalStats);

            // Pre-fill form inputs with existing limits.
            setNewMaxLoss(riskProfile.max_daily_loss);
            setNewMaxTrades(riskProfile.max_trades_per_day);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    /**
     * Attempts to save new risk thresholds.
     * BLOCKED BY BACKEND if the user is currently in a "Locked" violation state.
     */
    const handleUpdateSettings = async () => {
        if (profile.is_locked) {
            setMessage("Cannot update limits while terminal is locked.");
            return;
        }
        setUpdating(true);
        try {
            await riskService.updateProfile({
                max_daily_loss: parseFloat(newMaxLoss),
                max_trades_per_day: parseInt(newMaxTrades)
            });
            setShowSettings(false);
            refreshData();
        } catch (e: any) {
            // Friendly error if the backend rejects the change (Integrity Check).
            setMessage(e.response?.data?.[0] || "Update failed");
        } finally {
            setUpdating(false);
        }
    };

    if (loading && !profile) return (
        <div className="h-96 flex flex-col items-center justify-center p-8 text-center bg-surface border border-[#27272a] rounded-2xl">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-500 font-mono uppercase tracking-widest">Accessing Risk Vault...</p>
        </div>
    );

    const lossPercentage = Math.min((parseFloat(profile.current_daily_loss) / parseFloat(profile.max_daily_loss)) * 100, 100);
    const riskColor = profile.is_locked ? 'bg-danger' : lossPercentage > 80 ? 'bg-orange-600' : 'bg-primary';

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">shield</span>
                        Risk Manager
                    </h2>
                    <p className="text-slate-400">Protecting Your Account</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg border transition-all ${showSettings ? 'bg-primary border-primary text-white' : 'border-border text-slate-500 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                    <div className="flex items-center gap-2 bg-surface border border-[#27272a] px-3 py-1.5 rounded-full">
                        <div className={`size-2 rounded-full ${profile.is_locked ? 'bg-danger' : 'bg-success'} animate-pulse`}></div>
                        <span className={`text-xs font-mono ${profile.is_locked ? 'text-danger' : 'text-success'}`}>
                            {profile.is_locked ? 'LOCKED' : 'ACTIVE'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Settings Overlay */}
            {showSettings && (
                <div className="glass-card rounded-3xl p-8 mb-8 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Adjust Risk Settings</h3>
                        <button onClick={() => setShowSettings(false)} className="material-symbols-outlined text-slate-500 hover:text-white">close</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Max Daily Loss (USD)</label>
                            <input
                                type="number"
                                value={newMaxLoss}
                                onChange={(e) => setNewMaxLoss(e.target.value)}
                                className="terminal-input w-full"
                                placeholder="E.g. 200.00"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Max Trades Per Day</label>
                            <input
                                type="number"
                                value={newMaxTrades}
                                onChange={(e) => setNewMaxTrades(e.target.value)}
                                className="terminal-input w-full"
                                placeholder="E.g. 5"
                            />
                        </div>
                    </div>

                    {message && (
                        <p className="text-danger text-[10px] font-black uppercase tracking-widest mt-4 animate-pulse">{message}</p>
                    )}

                    <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
                        <button
                            onClick={async () => {
                                if (confirm("DANGER: This will delete ALL strategies, trades, and reset your risk limits. Continue?")) {
                                    setUpdating(true);
                                    await journalService.fullReset();
                                    setShowSettings(false);
                                    refreshData();
                                }
                            }}
                            className="text-[10px] font-black text-danger/50 hover:text-danger flex items-center gap-2 transition-all uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-sm">delete_forever</span>
                            Clear My Account
                        </button>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-6 py-2 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
                            >Cancel</button>
                            <button
                                onClick={handleUpdateSettings}
                                disabled={updating || profile.is_locked}
                                className={`btn-primary px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${updating ? 'opacity-50' : ''}`}
                            >
                                {updating ? 'SAVING...' : 'SAVE SETTINGS'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lock Overlay */}
            {profile.is_locked && (
                <div className="bg-danger/10 border-2 border-danger p-4 md:p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 animate-in slide-in-from-top-4 duration-500 group">
                    <div className="p-3 md:p-4 bg-danger rounded-2xl text-white shadow-lg shadow-danger/20">
                        <span className="material-symbols-outlined text-2xl md:text-3xl">lock</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-tighter">Trading Pause</h3>
                        <p className="text-danger font-mono text-xs md:text-sm font-bold">{profile.lock_reason}</p>
                    </div>

                    {profile.locked_at && (
                        <LockCountdown lockedAt={profile.locked_at} onComplete={refreshData} />
                    )}

                    {!profile.locked_at && (
                        <p className="text-[10px] text-slate-500 max-w-[150px] text-right italic font-serif hidden md:block">
                            Discipline is the key to profit.
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily P&L Card */}
                <div className="p-8 bg-surface rounded-2xl border border-[#27272a] relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-9xl">trending_down</span>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest flex items-center gap-2">
                            Total Daily Loss
                        </h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="flex items-baseline gap-2">
                            <span className={`text-5xl font-mono font-black ${profile.is_locked ? 'text-danger' : 'text-white'}`}>
                                ${parseFloat(profile.current_daily_loss).toFixed(2)}
                            </span>
                            <span className="text-slate-600 font-mono text-xl">/ ${parseFloat(profile.max_daily_loss).toFixed(0)}</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                <span>Risk Exposure</span>
                                <span>{lossPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-[2px] shadow-inner border border-white/5">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)] ${riskColor}`}
                                    style={{ width: `${lossPercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 flex justify-between items-center">
                            <span className="text-xs text-slate-500 uppercase font-bold">Safe Room Remaining</span>
                            <span className="font-mono font-bold text-white">
                                ${(parseFloat(profile.max_daily_loss) - parseFloat(profile.current_daily_loss)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trade Limit Card */}
                <div className="p-8 bg-surface rounded-2xl border border-[#27272a] shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest">Daily Frequency</h3>
                        <span className="text-3xl font-mono font-black text-white">
                            {profile.trades_today} <span className="text-slate-600 text-xl">/ {profile.max_trades_per_day}</span>
                        </span>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-10">
                        {Array.from({ length: profile.max_trades_per_day }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${i < profile.trades_today
                                    ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                    : 'border-slate-800 bg-slate-900/50 text-slate-700'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {i < profile.trades_today ? 'bolt' : 'circle'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-[#0a0a0c] rounded-2xl border border-[#27272a] flex flex-col gap-2">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                            <span>Signals Detected Today</span>
                            <span>{profile.trades_today}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                            <span>Capacity Locked</span>
                            <span className={profile.trades_today >= profile.max_trades_per_day ? 'text-danger' : 'text-success'}>
                                {((profile.trades_today / profile.max_trades_per_day) * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Ledger Integration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Win Rate', val: `${stats?.win_rate || 0}%`, icon: 'speed' },
                    { label: 'Discipline', val: `${stats?.discipline_rate || 0}%`, icon: 'psychology' },
                    { label: 'Net Yield', val: `$${stats?.total_pnl || 0}`, icon: 'payments' },
                    { label: 'Avg Win', val: `$${stats?.avg_win || 0}`, icon: 'trending_up' }
                ].map((s, i) => (
                    <div key={i} className="bg-surface border border-[#27272a] p-4 rounded-2xl flex flex-col items-center">
                        <span className="material-symbols-outlined text-slate-600 text-sm mb-2">{s.icon}</span>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{s.label}</p>
                        <p className="text-white font-mono font-bold">{s.val}</p>
                    </div>
                ))}
            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={refreshData}
                    className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest border border-[#27272a] px-6 py-2 rounded-full"
                >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Refresh Integrity
                </button>
            </div>
        </div>
    );
};

export default RiskGuardian;

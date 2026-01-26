import { useState, useEffect } from 'react';
import { strategyService, journalService, riskService } from '../services/endpoints';

interface Strategy {
    id: number;
    name: string;
    description: string;
    checklist_items: string[];
}

const ExecutionMode = ({ onTradeLogged }: { onTradeLogged: () => void }) => {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [riskStatus, setRiskStatus] = useState<{ allowed: boolean, reason?: string }>({ allowed: true });
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const [stratData, riskProfile] = await Promise.all([
                    strategyService.list(),
                    riskService.getProfile()
                ]);
                setStrategies(stratData);

                // Real-time Risk Check: Is the terminal locked?
                if (riskProfile.is_locked) {
                    setRiskStatus({ allowed: false, reason: riskProfile.lock_reason });
                } else if (riskProfile.trades_today >= riskProfile.max_trades_per_day) {
                    setRiskStatus({ allowed: false, reason: "Daily Trade Limit Reached" });
                }
            } catch (e) {
                console.error(e);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (selectedStrategy) {
            setCheckedItems(new Array(selectedStrategy.checklist_items.length).fill(false));
            setIsUnlocked(false);
            setSuccessMessage(false);
        }
    }, [selectedStrategy]);

    useEffect(() => {
        if (checkedItems.length > 0 && checkedItems.every(Boolean)) {
            setIsUnlocked(true);
        } else {
            setIsUnlocked(false);
        }
    }, [checkedItems]);

    const handleToggleItem = (index: number) => {
        if (!riskStatus.allowed) return;
        const updated = [...checkedItems];
        updated[index] = !updated[index];
        setCheckedItems(updated);
    };

    const handleEnterTrade = async () => {
        if (!selectedStrategy || !isUnlocked || !riskStatus.allowed) return;
        setLoading(true);
        try {
            // Log an OPEN trade immediately. This syncs with Risk Guardian logic.
            await journalService.openTrade(selectedStrategy.id, true);

            setSuccessMessage(true);
            setIsUnlocked(false);
            setCheckedItems(new Array(selectedStrategy.checklist_items.length).fill(false));

            // Wait 2 seconds then redirect to journal to see the open position
            setTimeout(() => {
                onTradeLogged();
            }, 2000);
        } catch (error) {
            console.error("Failed to enter trade:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!riskStatus.allowed) {
        return (
            <div className="max-w-xl mx-auto mt-20 p-12 glass-card border-2 border-danger/30 rounded-[40px] text-center space-y-6 animate-in zoom-in-95 duration-700 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                <div className="mx-auto size-24 bg-danger/10 rounded-[32px] flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-6xl text-danger animate-pulse">lock_person</span>
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Trading Locked</h2>
                <div className="bg-danger/10 border border-danger/20 py-2 px-4 rounded-xl inline-block">
                    <p className="text-danger font-mono text-xs font-black uppercase tracking-widest">{riskStatus.reason}</p>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto font-medium">
                    The Risk Manager has disabled trading to protect your account.
                    Impulse control is more important than catching every move.
                </p>
                <div className="pt-8 border-t border-border flex justify-center">
                    <div className="flex items-center gap-2 opacity-40">
                        <div className="size-1.5 rounded-full bg-slate-700"></div>
                        <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Waiting for Cooldown</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-success text-4xl">play_circle</span>
                        TAKE A TRADE
                    </h2>
                    <p className="text-slate-500 font-mono text-sm mt-1 uppercase tracking-widest">Active Checklist v3.0</p>
                </div>
            </header>

            {successMessage && (
                <div className="bg-success/10 border-2 border-success/20 p-8 rounded-3xl flex items-center gap-6 animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-success/5">
                    <div className="size-14 bg-success rounded-2xl flex items-center justify-center text-white shadow-lg shadow-success/20">
                        <span className="material-symbols-outlined text-3xl font-black">verified</span>
                    </div>
                    <div>
                        <h4 className="font-black text-white uppercase tracking-tighter text-lg">Trade Logged</h4>
                        <p className="text-xs text-success/70 font-bold uppercase tracking-widest">Checklist verified. Good luck with the trade!</p>
                    </div>
                </div>
            )}

            <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                    <span className="material-symbols-outlined text-9xl">hub</span>
                </div>

                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-1">Select Your Strategy</h3>
                <div className="flex flex-wrap gap-3 relative z-10">
                    {strategies.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedStrategy(s)}
                            className={`px-6 py-3 rounded-2xl border-2 transition-all text-[11px] font-black uppercase tracking-tight ${selectedStrategy?.id === s.id
                                ? 'border-primary bg-primary/10 text-white shadow-lg shadow-primary/10'
                                : 'border-border bg-[#0a0a0c]/50 text-slate-500 hover:border-slate-700'
                                }`}
                        >
                            {s.name}
                        </button>
                    ))}
                    {strategies.length === 0 && (
                        <p className="text-xs text-slate-600 font-mono px-1">No strategies found. Go to Strategy Lab to create one.</p>
                    )}
                </div>
            </div>

            {selectedStrategy && (
                <div className="glass-card rounded-[40px] p-12 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                        <span className="material-symbols-outlined text-9xl text-slate-500 font-black">rule</span>
                    </div>

                    <div className="flex justify-between items-center mb-12 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-500 text-3xl">checklist</span>
                                {selectedStrategy.name}
                            </h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Before Entering Trade</p>
                        </div>

                    </div>

                    <div className="space-y-4 max-w-3xl relative z-10">
                        {selectedStrategy.checklist_items.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleToggleItem(idx)}
                                className={`w-full text-left p-5 rounded-3xl border-2 flex items-center gap-6 transition-all duration-300 transform active:scale-[0.99] ${checkedItems[idx]
                                    ? 'border-success bg-success/[0.03] shadow-lg shadow-success/5'
                                    : 'border-border bg-[#050507]/40 hover:border-slate-700'
                                    }`}
                            >
                                <div className={`size-8 rounded-xl border-2 flex items-center justify-center transition-all ${checkedItems[idx] ? 'bg-success border-success text-white shadow-lg shadow-success/20' : 'border-slate-800 bg-slate-900/50'
                                    }`}>
                                    {checkedItems[idx] && <span className="material-symbols-outlined text-lg font-black">check</span>}
                                </div>
                                <span className={`text-sm font-bold tracking-tight ${checkedItems[idx] ? 'text-white' : 'text-slate-400'}`}>
                                    {item}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-16 pt-10 border-t border-border flex flex-col items-center relative z-10">
                        <button
                            onClick={handleEnterTrade}
                            disabled={!isUnlocked || loading}
                            className={`w-full max-w-xl py-6 rounded-[28px] font-black text-sm tracking-[0.2em] uppercase transition-all duration-500 flex items-center justify-center gap-4 ${isUnlocked
                                ? 'bg-success hover:bg-green-600 text-white shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)] hover:-translate-y-1'
                                : 'bg-slate-900/50 border border-white/5 text-slate-700 cursor-not-allowed'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-2xl ${isUnlocked ? 'animate-glide' : ''}`}>
                                {isUnlocked ? 'lock_open' : 'lock'}
                            </span>
                            {loading ? 'PROCESSING...' : (isUnlocked ? 'START TRADE' : 'FINISH CHECKLIST')}
                        </button>
                        <p className="mt-6 text-[9px] text-slate-600 font-mono uppercase tracking-widest opacity-60">
                            Always follow your plan.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExecutionMode;

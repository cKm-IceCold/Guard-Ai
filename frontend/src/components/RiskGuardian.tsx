import { useState, useEffect } from 'react';

const RiskGuardian = () => {
    // State for risk metrics
    const [stats, setStats] = useState({
        dailyLoss: 145.50,
        maxLoss: 500.00,
        trades: 3,
        maxTrades: 5,
        isLocked: false,
        lockReason: ''
    });

    // Simulated "Open P&L" that fluctuates
    const [openPnL, setOpenPnL] = useState(25.0);

    // Effect to simulate live market fluctuations
    useEffect(() => {
        if (stats.isLocked) return;

        const interval = setInterval(() => {
            setOpenPnL(prev => prev + (Math.random() - 0.5) * 5);
        }, 1000);
        return () => clearInterval(interval);
    }, [stats.isLocked]);

    // Check limits
    useEffect(() => {
        if (!stats.isLocked) {
            if (stats.dailyLoss >= stats.maxLoss) {
                lockAccount("Daily Loss Limit Hit");
            } else if (stats.trades >= stats.maxTrades) {
                lockAccount("Max Trade Volume Hit");
            }
        }
    }, [stats.dailyLoss, stats.trades]);

    const lockAccount = (reason: string) => {
        setStats(prev => ({ ...prev, isLocked: true, lockReason: reason }));
    };

    const handleSimulateTrade = (pnl: number) => {
        if (stats.isLocked) return;

        const newLoss = pnl < 0 ? stats.dailyLoss + Math.abs(pnl) : stats.dailyLoss - pnl;
        // Note: Usually "Daily Loss" tracks only losses or net P&L. 
        // For this guardian, let's assume it tracks "Drawdown from starting balance".
        // Simplified: If pnl is negative, we add to "Loss". If positive, we reduce "Loss" (recover).

        // Actually, let's treat "Daily Loss" as "Net Negative P&L". 
        // If I make $100, my "Daily Loss" reduces (I have more buffer).
        // If I lose $100, my "Daily Loss" increases.

        setStats(prev => ({
            ...prev,
            dailyLoss: Math.max(0, prev.dailyLoss - pnl), // Inverse logic: Profit reduces current drawdown
            trades: prev.trades + 1
        }));
    };

    const resetDay = () => {
        setStats({
            dailyLoss: 0,
            maxLoss: 500.00,
            trades: 0,
            maxTrades: 5,
            isLocked: false,
            lockReason: ''
        });
    };

    const lossPercentage = Math.min((stats.dailyLoss / stats.maxLoss) * 100, 100);
    const riskColor = lossPercentage > 80 ? 'bg-red-500' : lossPercentage > 50 ? 'bg-orange-500' : 'bg-primary';

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">shield</span>
                        Risk Guardian
                    </h2>
                    <p className="text-slate-400">Active Protection Module</p>
                </div>
                <div className="flex items-center gap-2 bg-surface border border-[#27272a] px-3 py-1.5 rounded-full">
                    <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-mono text-green-500">SYSTEM ACTIVE</span>
                </div>
            </header>

            {/* Lock Overlay */}
            {stats.isLocked && (
                <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
                    <div className="p-3 bg-red-500 rounded-full text-white">
                        <span className="material-symbols-outlined text-2xl">lock</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-red-500">TRADING LOCKED</h3>
                        <p className="text-red-400">{stats.lockReason}</p>
                    </div>
                    <button
                        onClick={resetDay}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
                    >
                        Override (Admin)
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily P&L Card */}
                <div className="p-6 bg-surface rounded-2xl border border-[#27272a] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-9xl">trending_down</span>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                            Daily Drawdown
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">USD</span>
                        </h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="flex items-baseline gap-2">
                            <span className={`text-5xl font-bold ${lossPercentage > 80 ? 'text-red-500' : 'text-white'}`}>
                                ${stats.dailyLoss.toFixed(2)}
                            </span>
                            <span className="text-slate-500 font-mono">/ ${stats.maxLoss.toFixed(0)}</span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                                <span> exposure </span>
                                <span> {lossPercentage.toFixed(1)}% </span>
                            </div>
                            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden p-[2px]">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${riskColor}`}
                                    style={{ width: `${lossPercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-800/50 rounded-xl border border-white/5 flex justify-between items-center">
                            <span className="text-sm text-slate-400">Remaining Allowance</span>
                            <span className="font-mono font-bold text-white">
                                ${(stats.maxLoss - stats.dailyLoss).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trade Limit Card */}
                <div className="p-6 bg-surface rounded-2xl border border-[#27272a] flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                                Trade Frequency
                                <span className="material-symbols-outlined text-slate-500 text-sm">info</span>
                            </h3>
                            <span className="text-2xl font-bold text-white">{stats.trades} <span className="text-slate-500 text-lg">/ {stats.maxTrades}</span></span>
                        </div>

                        <div className="flex gap-3 mb-8">
                            {Array.from({ length: stats.maxTrades }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-16 flex-1 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${i < stats.trades
                                            ? 'border-purple-500 bg-purple-500/20 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                            : 'border-slate-800 bg-slate-800/30 text-slate-700'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl">
                                        {i < stats.trades ? 'bolt' : 'check_indeterminate_small'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-800/30 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-400">Simulated Open P&L</span>
                            <span className={`font-mono font-bold ${openPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                {openPnL >= 0 ? '+' : ''}{openPnL.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => handleSimulateTrade(50)}
                                disabled={stats.isLocked}
                                className="flex-1 bg-success/20 hover:bg-success/30 text-success border border-success/30 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Win (+$50)
                            </button>
                            <button
                                onClick={() => handleSimulateTrade(-80)}
                                disabled={stats.isLocked}
                                className="flex-1 bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Loss (-$80)
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-600 mt-2 uppercase tracking-widest">Simulation Controls</p>
                    </div>
                </div>
            </div>

            {/* Expanded Stats Area */}
            <div className="grid grid-cols-4 gap-4">
                {['Win Rate: 65%', 'Avg Win: $120', 'Avg Loss: $55', 'Profit Factor: 2.18'].map((stat, i) => (
                    <div key={i} className="bg-surface border border-[#27272a] p-3 rounded-xl text-center">
                        <p className="text-xs text-slate-500 font-bold uppercase">{stat.split(':')[0]}</p>
                        <p className="text-white font-mono font-bold">{stat.split(':')[1]}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RiskGuardian;

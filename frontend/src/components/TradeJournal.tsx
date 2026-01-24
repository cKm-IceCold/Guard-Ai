import { useState, useEffect } from 'react';
import { journalService } from '../services/endpoints';

interface Trade {
    id: number;
    strategy_name: string;
    result: 'WIN' | 'LOSS';
    pnl: string;
    notes: string;
    followed_plan: boolean;
    created_at: string;
}

interface Stats {
    total_trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    total_pnl: string;
    avg_win: string | null;
    avg_loss: string | null;
    discipline_rate: number;
}

const TradeJournal = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        setLoading(true);
        try {
            const [tradesData, statsData] = await Promise.all([
                journalService.listTrades(),
                journalService.getStats()
            ]);
            setTrades(tradesData);
            setStats(statsData);
        } catch (error) {
            console.error("Failed to fetch journal data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) return (
        <div className="h-96 flex flex-col items-center justify-center p-8 text-center bg-surface border border-[#27272a] rounded-2xl">
             <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-sm text-slate-500 font-mono uppercase">Syncing Ledger...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">book</span>
                        Trade Journal
                    </h2>
                    <p className="text-slate-400">Review your performance and discipline history</p>
                </div>
                <button 
                    onClick={refreshData}
                    className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
                >
                    <span className="material-symbols-outlined">refresh</span>
                </button>
            </header>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-surface border border-[#27272a] p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Win Rate</p>
                        <p className="text-3xl font-mono font-bold text-white">{stats.win_rate}%</p>
                        <div className="w-full h-1 bg-slate-800 mt-4 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${stats.win_rate}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-surface border border-[#27272a] p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total P&L</p>
                        <p className={`text-3xl font-mono font-bold ${Number(stats.total_pnl) >= 0 ? 'text-success' : 'text-danger'}`}>
                            ${stats.total_pnl}
                        </p>
                    </div>
                    <div className="bg-surface border border-[#27272a] p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Discipline</p>
                        <p className="text-3xl font-mono font-bold text-primary">{stats.discipline_rate}%</p>
                    </div>
                    <div className="bg-surface border border-[#27272a] p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Trades</p>
                        <p className="text-3xl font-mono font-bold text-white">{stats.total_trades}</p>
                    </div>
                </div>
            )}

            {/* Trade List */}
            <div className="bg-surface border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0a0a0c] text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-[#27272a]">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Strategy</th>
                                <th className="px-6 py-4">Result</th>
                                <th className="px-6 py-4 text-right">P&L</th>
                                <th className="px-6 py-4 text-center">Plan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a]">
                            {trades.length > 0 ? (
                                trades.map((trade) => (
                                    <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                            {new Date(trade.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-white">{trade.strategy_name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                                trade.result === 'WIN' 
                                                    ? 'bg-success/5 text-success border-success/20' 
                                                    : 'bg-danger/5 text-danger border-danger/20'
                                            }`}>
                                                {trade.result}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-sm text-right font-mono font-bold ${
                                            Number(trade.pnl) >= 0 ? 'text-success' : 'text-danger'
                                        }`}>
                                            {Number(trade.pnl) >= 0 ? '+' : ''}{trade.pnl}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {trade.followed_plan ? (
                                                <span className="material-symbols-outlined text-primary text-lg">verified</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-slate-700 text-lg">heart_broken</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-32 text-center text-slate-500 italic text-sm">
                                        No entries in journal yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TradeJournal;

import { useState, useEffect } from 'react';
import { journalService } from '../services/endpoints';

interface Trade {
    id: number;
    strategy_name: string;
    status: 'OPEN' | 'CLOSED';
    result: 'WIN' | 'LOSS' | 'BREAKEVEN' | null;
    pnl: string | null;
    notes: string;
    followed_plan: boolean;
    created_at: string;
    image_before: string | null;
    image_after: string | null;
    image_live: string | null;
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
    // TRANSACTIONAL DATA: List of all trades for the current user.
    const [trades, setTrades] = useState<Trade[]>([]);
    // Aggregated metrics used in the top row of cards.
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    // CLOSING MODAL STATE: Used when a user manually transitions an OPEN trade to CLOSED.
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [closeResult, setCloseResult] = useState<'WIN' | 'LOSS' | 'BREAKEVEN'>('WIN');
    const [closePnl, setClosePnl] = useState('0');
    const [closeNotes, setCloseNotes] = useState('');
    const [closing, setClosing] = useState(false);

    // Image Upload State
    const [imgBefore, setImgBefore] = useState<File | null>(null);
    const [imgAfter, setImgAfter] = useState<File | null>(null);
    const [imgLive, setImgLive] = useState<File | null>(null);

    useEffect(() => {
        refreshData();
    }, []);

    /**
     * Refreshes the journal entries and performance statistics.
     */
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

    /**
     * Outcome Selector: Automatically handles P&L sign (+/-) based on the result.
     * Enforces mathematical sanity: Win = Positive, Loss = Negative.
     */
    const handleResultSelect = (res: 'WIN' | 'LOSS' | 'BREAKEVEN') => {
        setCloseResult(res);
        if (res === 'BREAKEVEN') {
            setClosePnl('0');
        } else if (res === 'LOSS') {
            const val = parseFloat(closePnl);
            if (val > 0) setClosePnl((val * -1).toString());
            else if (val === 0) setClosePnl('-10'); // Default loss suggestion.
        } else if (res === 'WIN') {
            const val = parseFloat(closePnl);
            if (val < 0) setClosePnl(Math.abs(val).toString());
            else if (val === 0) setClosePnl('10'); // Default win suggestion.
        }
    };

    /**
     * Finalizes the trade on the backend.
     * Triggers the Risk Engine to update daily loss metrics if a LOSS is recorded.
     */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            setter(e.target.files[0]);
        }
    };

    /**
     * Finalizes the trade on the backend.
     * Triggers the Risk Engine to update daily loss metrics if a LOSS is recorded.
     */
    const handleCloseTrade = async () => {
        if (!selectedTrade) return;
        setClosing(true);
        try {
            let finalPnl = parseFloat(closePnl);
            // Redundant check to ensure proper P&L sign is recorded in the ledger.
            if (closeResult === 'LOSS' && finalPnl > 0) finalPnl = -finalPnl;
            if (closeResult === 'WIN' && finalPnl < 0) finalPnl = Math.abs(finalPnl);
            if (closeResult === 'BREAKEVEN') finalPnl = 0;

            await journalService.closeTrade(
                selectedTrade.id,
                closeResult,
                finalPnl,
                closeNotes,
                { before: imgBefore, after: imgAfter, live: imgLive }
            );
            setSelectedTrade(null);
            setImgBefore(null);
            setImgAfter(null);
            setImgLive(null);
            setCloseNotes('');
            setClosePnl('0');
            refreshData();
        } catch (error) {
            console.error(error);
        } finally {
            setClosing(false);
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
            {/* Close Trade Modal */}
            {selectedTrade && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-surface border border-[#27272a] rounded-2xl p-8 w-full max-w-md animate-in zoom-in-95 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">Close Trade Entry</h3>
                        <p className="text-xs text-slate-500 mb-6 uppercase">Strategy: {selectedTrade.strategy_name}</p>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Outcome</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleResultSelect('WIN')}
                                        className={`flex-1 py-3 rounded-xl font-black transition-all border-2 text-[10px] ${closeResult === 'WIN' ? 'border-success bg-success/10 text-success' : 'border-[#27272a] text-slate-600'
                                            }`}
                                    >WIN</button>
                                    <button
                                        onClick={() => handleResultSelect('BREAKEVEN')}
                                        className={`flex-1 py-3 rounded-xl font-black transition-all border-2 text-[10px] ${closeResult === 'BREAKEVEN' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-[#27272a] text-slate-600'
                                            }`}
                                    >B.E</button>
                                    <button
                                        onClick={() => handleResultSelect('LOSS')}
                                        className={`flex-1 py-3 rounded-xl font-black transition-all border-2 text-[10px] ${closeResult === 'LOSS' ? 'border-danger bg-danger/10 text-danger' : 'border-[#27272a] text-slate-600'
                                            }`}
                                    >LOSS</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Final P&L (USD)</label>
                                <input
                                    type="number"
                                    value={closePnl}
                                    onChange={(e) => setClosePnl(e.target.value)}
                                    className={`w-full bg-[#0a0a0c] border border-[#27272a] rounded-xl px-4 py-3 font-mono focus:outline-none focus:border-primary ${parseFloat(closePnl) > 0 ? 'text-success' : parseFloat(closePnl) < 0 ? 'text-danger' : 'text-white'
                                        }`}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Notes</label>
                                <textarea
                                    value={closeNotes}
                                    onChange={(e) => setCloseNotes(e.target.value)}
                                    placeholder="Reflection on the outcome..."
                                    className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none h-24 resize-none text-sm"
                                />
                            </div>

                            {/* Image Uploads */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Trade Screenshots (Max 3)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {/* Before */}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="img-before"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, setImgBefore)}
                                            accept="image/*"
                                        />
                                        <label htmlFor="img-before" className={`block w-full aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors ${imgBefore ? 'border-success bg-success/10' : 'border-[#27272a]'}`}>
                                            <span className="material-symbols-outlined text-xl mb-1">{imgBefore ? 'check' : 'image'}</span>
                                            <span className="text-[8px] font-bold uppercase">{imgBefore ? 'Attached' : 'Before'}</span>
                                        </label>
                                    </div>
                                    {/* Live */}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="img-live"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, setImgLive)}
                                            accept="image/*"
                                        />
                                        <label htmlFor="img-live" className={`block w-full aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors ${imgLive ? 'border-success bg-success/10' : 'border-[#27272a]'}`}>
                                            <span className="material-symbols-outlined text-xl mb-1">{imgLive ? 'check' : 'bolt'}</span>
                                            <span className="text-[8px] font-bold uppercase">{imgLive ? 'Attached' : 'Live'}</span>
                                        </label>
                                    </div>
                                    {/* After */}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="img-after"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, setImgAfter)}
                                            accept="image/*"
                                        />
                                        <label htmlFor="img-after" className={`block w-full aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors ${imgAfter ? 'border-success bg-success/10' : 'border-[#27272a]'}`}>
                                            <span className="material-symbols-outlined text-xl mb-1">{imgAfter ? 'check' : 'flag'}</span>
                                            <span className="text-[8px] font-bold uppercase">{imgAfter ? 'Attached' : 'After'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setSelectedTrade(null)}
                                    className="flex-1 py-3 text-slate-500 text-sm font-bold hover:text-white transition-colors"
                                >CANCEL</button>
                                <button
                                    onClick={handleCloseTrade}
                                    disabled={closing}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {closing ? 'CLOSING...' : 'FINALIZE ENTRY'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Signals</p>
                        <p className="text-3xl font-mono font-bold text-white">{stats.total_trades}</p>
                    </div>
                </div>
            )}

            {/* Trade List */}
            <div className="bg-surface border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                        <thead>
                            <tr className="bg-[#0a0a0c] text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-[#27272a]">
                                <th className="px-4 md:px-6 py-4">Date</th>
                                <th className="px-4 md:px-6 py-4">Strategy</th>
                                <th className="px-4 md:px-6 py-4 hidden sm:table-cell">Status</th>
                                <th className="px-4 md:px-6 py-4 text-right">P&L</th>
                                <th className="px-4 md:px-6 py-4 text-center hidden md:table-cell">Plan</th>
                                <th className="px-4 md:px-6 py-4 text-center hidden md:table-cell">Visuals</th>
                                <th className="px-4 md:px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a]">
                            {trades.length > 0 ? (
                                trades.map((trade) => (
                                    <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 md:px-6 py-4 text-[11px] md:text-sm text-slate-500 font-mono">
                                            {new Date(trade.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <p className="text-[12px] md:text-sm font-bold text-white max-w-[120px] md:max-w-none truncate">{trade.strategy_name}</p>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 hidden sm:table-cell">
                                            {trade.status === 'OPEN' ? (
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                    OPEN
                                                </span>
                                            ) : (
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black uppercase border ${trade.result === 'WIN'
                                                    ? 'bg-success/5 text-success border-success/20'
                                                    : trade.result === 'LOSS'
                                                        ? 'bg-danger/5 text-danger border-danger/20'
                                                        : 'bg-yellow-500/5 text-yellow-500 border-yellow-500/20'
                                                    }`}>
                                                    {trade.result}
                                                </span>
                                            )}
                                        </td>
                                        <td className={`px-4 md:px-6 py-4 text-[12px] md:text-sm text-right font-mono font-bold ${trade.status === 'OPEN' ? 'text-slate-600' : (Number(trade.pnl) > 0 ? 'text-success' : Number(trade.pnl) < 0 ? 'text-danger' : 'text-white')
                                            }`}>
                                            {trade.status === 'OPEN' ? '---' : `${Number(trade.pnl) > 0 ? '+' : ''}${trade.pnl}`}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-center hidden md:table-cell">
                                            {trade.followed_plan ? (
                                                <span className="material-symbols-outlined text-primary text-lg">verified</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-slate-700 text-lg">heart_broken</span>
                                            )}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-center hidden md:table-cell">
                                            <div className="flex justify-center -space-x-2">
                                                {trade.image_before && (
                                                    <a href={trade.image_before} target="_blank" rel="noopener noreferrer" className="size-6 rounded-full border border-[#27272a] bg-surface flex items-center justify-center hover:scale-110 transition-transform z-0 hover:z-10">
                                                        <span className="material-symbols-outlined text-[10px] text-slate-400">image</span>
                                                    </a>
                                                )}
                                                {trade.image_live && (
                                                    <a href={trade.image_live} target="_blank" rel="noopener noreferrer" className="size-6 rounded-full border border-[#27272a] bg-surface flex items-center justify-center hover:scale-125 transition-transform z-0 hover:z-10">
                                                        <span className="material-symbols-outlined text-[10px] text-slate-400">bolt</span>
                                                    </a>
                                                )}
                                                {trade.image_after && (
                                                    <a href={trade.image_after} target="_blank" rel="noopener noreferrer" className="size-6 rounded-full border border-[#27272a] bg-surface flex items-center justify-center hover:scale-125 transition-transform z-0 hover:z-10">
                                                        <span className="material-symbols-outlined text-[10px] text-slate-400">flag</span>
                                                    </a>
                                                )}
                                                {!trade.image_before && !trade.image_live && !trade.image_after && (
                                                    <span className="text-[10px] text-slate-700">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-center">
                                            {trade.status === 'OPEN' ? (
                                                <button
                                                    onClick={() => setSelectedTrade(trade)}
                                                    className="bg-primary/20 text-primary hover:bg-primary hover:text-white px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black transition-all"
                                                >CLOSE</button>
                                            ) : (
                                                <span className="material-symbols-outlined text-slate-800 text-lg">check_circle</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-32 text-center text-slate-500 italic text-sm">
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

import { useState, useEffect } from 'react';
import { journalService } from '../services/endpoints';
import { notify } from './NotificationProvider';

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

    // DETAIL VIEW STATE: Used to view full details of any trade.
    const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);

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
            notify.success("Entry finalized. Syncing with ledger...");
        } catch (error) {
            console.error(error);
            notify.error("Sync Failure: Database rejected the entry.");
        } finally {
            setClosing(false);
        }
    };

    if (loading && !stats) return (
        <div className="h-96 flex flex-col items-center justify-center p-8 text-center bg-surface border border-border rounded-2xl">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-500 font-mono uppercase">Syncing Ledger...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Trade Detail Modal */}
            {viewingTrade && (
                <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
                    <div className="bg-[#0a0a0c] border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 shadow-[0_0_50px_rgba(0,0,0,0.5)] custom-scrollbar">
                        {/* Header */}
                        <div className="p-8 border-b border-border flex justify-between items-start sticky top-0 bg-background/80 backdrop-blur-md z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${viewingTrade.status === 'OPEN'
                                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                        : viewingTrade.result === 'WIN'
                                            ? 'bg-success/10 text-success border-success/20'
                                            : viewingTrade.result === 'LOSS'
                                                ? 'bg-danger/10 text-danger border-danger/20'
                                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                        }`}>
                                        {viewingTrade.status === 'OPEN' ? 'OPEN POSITION' : viewingTrade.result}
                                    </span>
                                    <span className="text-slate-600 font-mono text-xs">ID: {viewingTrade.id}</span>
                                </div>
                                <h3 className="text-2xl font-black text-text-main uppercase tracking-tight">{viewingTrade.strategy_name}</h3>
                                <p className="text-slate-500 text-sm mt-1">{new Date(viewingTrade.created_at).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => setViewingTrade(null)}
                                className="size-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-text-main hover:bg-white/10 transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Side: Stats & Notes */}
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="glass-card p-4 border-border bg-white/[0.02]">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">P&L Status</p>
                                        <p className={`text-2xl font-mono font-bold ${Number(viewingTrade.pnl) > 0 ? 'text-success' : Number(viewingTrade.pnl) < 0 ? 'text-danger' : 'text-text-main'
                                            }`}>
                                            {viewingTrade.status === 'OPEN' ? 'Active' : `${Number(viewingTrade.pnl) > 0 ? '+' : ''}${viewingTrade.pnl || '0.00'} USD`}
                                        </p>
                                    </div>
                                    <div className="glass-card p-4 border-border bg-white/[0.02]">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Execution</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined ${viewingTrade.followed_plan ? 'text-primary' : 'text-danger'}`}>
                                                {viewingTrade.followed_plan ? 'verified' : 'error'}
                                            </span>
                                            <span className="text-sm font-bold text-text-main">
                                                {viewingTrade.followed_plan ? 'Followed Plan' : 'Impulse Trade'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Journal Reflections</h4>
                                    <div className="p-6 bg-white/[0.03] border border-border rounded-2xl min-h-[120px]">
                                        <p className="text-slate-300 italic font-serif leading-relaxed whitespace-pre-wrap">
                                            {viewingTrade.notes || "No reflection recorded for this session."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Visual Evidence */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visual Evidence</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {viewingTrade.image_before && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Pre-Execution Setup</p>
                                            <div className="rounded-2xl overflow-hidden border border-border bg-black group relative">
                                                <img src={viewingTrade.image_before} className="w-full h-auto object-contain max-h-[300px]" alt="Setup" />
                                                <a href={viewingTrade.image_before} target="_blank" rel="noreferrer" className="absolute top-4 right-4 size-8 rounded-full bg-black/60 flex items-center justify-center text-text-main opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {viewingTrade.image_live && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Live Market State</p>
                                            <div className="rounded-2xl overflow-hidden border border-border bg-black group relative">
                                                <img src={viewingTrade.image_live} className="w-full h-auto object-contain max-h-[300px]" alt="Live" />
                                                <a href={viewingTrade.image_live} target="_blank" rel="noreferrer" className="absolute top-4 right-4 size-8 rounded-full bg-black/60 flex items-center justify-center text-text-main opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {viewingTrade.image_after && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Post-Trade Reflection</p>
                                            <div className="rounded-2xl overflow-hidden border border-border bg-black group relative">
                                                <img src={viewingTrade.image_after} className="w-full h-auto object-contain max-h-[300px]" alt="Post" />
                                                <a href={viewingTrade.image_after} target="_blank" rel="noreferrer" className="absolute top-4 right-4 size-8 rounded-full bg-black/60 flex items-center justify-center text-text-main opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {!viewingTrade.image_before && !viewingTrade.image_live && !viewingTrade.image_after && (
                                        <div className="p-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-slate-700">
                                            <span className="material-symbols-outlined text-4xl mb-2">hide_image</span>
                                            <p className="text-xs font-bold uppercase tracking-widest">No Visual Data Captured</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Trade Modal */}
            {selectedTrade && (
                <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[100] p-2 md:p-4 backdrop-blur-sm">
                    <div className="bg-surface border border-border rounded-xl md:rounded-2xl p-5 md:p-8 w-full max-w-md max-h-[95vh] overflow-y-auto animate-in zoom-in-95 shadow-2xl custom-scrollbar">
                        <h3 className="text-lg md:text-xl font-bold text-text-main mb-1 md:mb-2">Close Trade Entry</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 mb-4 md:mb-6 uppercase tracking-tight">Strategy: {selectedTrade.strategy_name}</p>

                        <div className="space-y-4 md:space-y-5">
                            <div>
                                <label className="block text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 md:mb-3">Outcome</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleResultSelect('WIN')}
                                        className={`flex-1 py-2.5 md:py-3 rounded-xl font-black transition-all border-2 text-[9px] md:text-[10px] ${closeResult === 'WIN' ? 'border-success bg-success/10 text-success' : 'border-border text-slate-600'
                                            }`}
                                    >WIN</button>
                                    <button
                                        onClick={() => handleResultSelect('BREAKEVEN')}
                                        className={`flex-1 py-2.5 md:py-3 rounded-xl font-black transition-all border-2 text-[9px] md:text-[10px] ${closeResult === 'BREAKEVEN' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-border text-slate-600'
                                            }`}
                                    >B.E</button>
                                    <button
                                        onClick={() => handleResultSelect('LOSS')}
                                        className={`flex-1 py-2.5 md:py-3 rounded-xl font-black transition-all border-2 text-[9px] md:text-[10px] ${closeResult === 'LOSS' ? 'border-danger bg-danger/10 text-danger' : 'border-border text-slate-600'
                                            }`}
                                    >LOSS</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-2">Final P&L (USD)</label>
                                <input
                                    type="number"
                                    value={closePnl}
                                    onChange={(e) => setClosePnl(e.target.value)}
                                    className={`w-full bg-background border border-border rounded-xl px-4 py-2.5 md:py-3 font-mono text-sm focus:outline-none focus:border-primary ${parseFloat(closePnl) > 0 ? 'text-success' : parseFloat(closePnl) < 0 ? 'text-danger' : 'text-text-main'
                                        }`}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-2">Notes</label>
                                <textarea
                                    value={closeNotes}
                                    onChange={(e) => setCloseNotes(e.target.value)}
                                    placeholder="Reflection on the outcome..."
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:border-primary focus:outline-none h-20 md:h-24 resize-none text-xs md:text-sm"
                                />
                            </div>

                            {/* Image Uploads */}
                            <div>
                                <label className="block text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-2">Trade Screenshots (Max 3)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="img-before"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, setImgBefore)}
                                            accept="image/*"
                                        />
                                        <label htmlFor="img-before" className={`block w-full aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors ${imgBefore ? 'border-success bg-success/10' : 'border-border'}`}>
                                            <span className="material-symbols-outlined text-lg md:text-xl mb-0.5 md:mb-1">{imgBefore ? 'check' : 'image'}</span>
                                            <span className="text-[7px] md:text-[8px] font-bold uppercase">{imgBefore ? 'Attached' : 'Before'}</span>
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="img-live"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, setImgLive)}
                                            accept="image/*"
                                        />
                                        <label htmlFor="img-live" className={`block w-full aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors ${imgLive ? 'border-success bg-success/10' : 'border-border'}`}>
                                            <span className="material-symbols-outlined text-lg md:text-xl mb-0.5 md:mb-1">{imgLive ? 'check' : 'bolt'}</span>
                                            <span className="text-[7px] md:text-[8px] font-bold uppercase">{imgLive ? 'Attached' : 'Live'}</span>
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="img-after"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, setImgAfter)}
                                            accept="image/*"
                                        />
                                        <label htmlFor="img-after" className={`block w-full aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors ${imgAfter ? 'border-success bg-success/10' : 'border-border'}`}>
                                            <span className="material-symbols-outlined text-lg md:text-xl mb-0.5 md:mb-1">{imgAfter ? 'check' : 'flag'}</span>
                                            <span className="text-[7px] md:text-[8px] font-bold uppercase">{imgAfter ? 'Attached' : 'After'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 md:gap-3 pt-2 md:pt-4">
                                <button
                                    onClick={() => setSelectedTrade(null)}
                                    className="flex-1 py-2.5 md:py-3 text-slate-500 text-xs md:text-sm font-bold hover:text-text-main transition-colors"
                                >CANCEL</button>
                                <button
                                    onClick={handleCloseTrade}
                                    disabled={closing}
                                    className="flex-1 py-2.5 md:py-3 bg-primary text-text-main rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 text-xs md:text-sm shadow-lg shadow-primary/10"
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
                    <h2 className="text-2xl font-bold text-text-main flex items-center gap-2">
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
                    <div className="bg-surface border border-border p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Win Rate</p>
                        <p className="text-3xl font-mono font-bold text-text-main">{stats.win_rate}%</p>
                        <div className="w-full h-1 bg-slate-800 mt-4 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${stats.win_rate}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-surface border border-border p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total P&L</p>
                        <p className={`text-3xl font-mono font-bold ${Number(stats.total_pnl) >= 0 ? 'text-success' : 'text-danger'}`}>
                            ${stats.total_pnl}
                        </p>
                    </div>
                    <div className="bg-surface border border-border p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Discipline</p>
                        <p className="text-3xl font-mono font-bold text-primary">{stats.discipline_rate}%</p>
                    </div>
                    <div className="bg-surface border border-border p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Signals</p>
                        <p className="text-3xl font-mono font-bold text-text-main">{stats.total_trades}</p>
                    </div>
                </div>
            )}

            {/* Trade List */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                        <thead>
                            <tr className="bg-surface text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-border">
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
                                    <tr
                                        key={trade.id}
                                        onClick={() => setViewingTrade(trade)}
                                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                    >
                                        <td className="px-4 md:px-6 py-4 text-[11px] md:text-sm text-slate-500 font-mono">
                                            {new Date(trade.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <p className="text-[12px] md:text-sm font-bold text-text-main max-w-[120px] md:max-w-none truncate">{trade.strategy_name}</p>
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
                                        <td className={`px-4 md:px-6 py-4 text-[12px] md:text-sm text-right font-mono font-bold ${trade.status === 'OPEN' ? 'text-slate-600' : (Number(trade.pnl) > 0 ? 'text-success' : Number(trade.pnl) < 0 ? 'text-danger' : 'text-text-main')
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
                                        <td className="px-4 md:px-6 py-4 text-center hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center -space-x-2">
                                                {trade.image_before && (
                                                    <a href={trade.image_before} target="_blank" rel="noopener noreferrer" className="size-6 rounded-full border border-border bg-surface flex items-center justify-center hover:scale-110 transition-transform z-0 hover:z-10">
                                                        <span className="material-symbols-outlined text-[10px] text-slate-400">image</span>
                                                    </a>
                                                )}
                                                {trade.image_live && (
                                                    <a href={trade.image_live} target="_blank" rel="noopener noreferrer" className="size-6 rounded-full border border-border bg-surface flex items-center justify-center hover:scale-125 transition-transform z-0 hover:z-10">
                                                        <span className="material-symbols-outlined text-[10px] text-slate-400">bolt</span>
                                                    </a>
                                                )}
                                                {trade.image_after && (
                                                    <a href={trade.image_after} target="_blank" rel="noopener noreferrer" className="size-6 rounded-full border border-border bg-surface flex items-center justify-center hover:scale-125 transition-transform z-0 hover:z-10">
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTrade(trade);
                                                    }}
                                                    className="bg-primary/20 text-primary hover:bg-primary hover:text-text-main px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black transition-all"
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

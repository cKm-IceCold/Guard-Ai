import { useState, useEffect } from 'react';
import { strategyService } from '../services/endpoints';
import { notify } from './NotificationProvider';
import { useAuthStore } from '../store/useAuthStore';
import CustomRuleList from './CustomRuleList';

interface Strategy {
    id: number;
    name: string;
    description: string;
    checklist_items: string[];
    chart_image_1?: string;
    chart_image_2?: string;
    chart_image_3?: string;
    is_public: boolean;
    created_at: string;
}

const MAX_STRATEGIES = 3;
const TRADING_QUOTES = [
    "\"The goal of a successful trader is to make the best trades. Money is secondary.\" — Alexander Elder",
    "\"Trade your plan, plan your trade. Master a few setups, not many.\" — Linda Raschke",
    "\"It is better to be a master of one than a jack of all trades.\" — Ancient Wisdom",
    "\"Simplicity is the ultimate sophistication.\" — Leonardo da Vinci"
];

/**
 * StrategyBuilder Component
 * 
 * The 'Strategy Lab' of the application. 
 * Allows users to:
 * 1. Define a trading strategy in natural language.
 * 2. Use AI (Gemini) to distill that strategy into a binary checklist.
 * 3. Run historical simulations (backtests) powered by AI.
 * 4. Manage visual references (Chart Screenshots & Rule Patterns).
 */
const StrategyBuilder = () => {
    /** 
     * FORM STATE: Capture's the trader's plan.
     * `description` is the most important field as it's the source for AI analysis.
     */
    const [description, setDescription] = useState('');
    const [strategyName, setStrategyName] = useState('');
    const [loading, setLoading] = useState(false);

    /** 
     * PROTOCOL STATE: Manages the 'Source of Truth' for the strategy.
     * `checklist` stores the AI-generated rules that appear in Execution mode.
     */
    const [checklist, setChecklist] = useState<string[]>([]);
    const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

    /** 
     * UI STATE: Enhances UX with feedback and guardrails.
     * `showLimitModal` enforces the 'Rule of 3' (max 3 strategies per user).
     */
    const [showLimitModal, setShowLimitModal] = useState(false);

    const [quoteTip, setQuoteTip] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedChecklist, setEditedChecklist] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    // BACKTEST STATE: Performance simulations on historical data.
    const [backtestResult, setBacktestResult] = useState<any>(null);
    const [backtesting, setBacktesting] = useState(false);

    // CHART IMAGES STATE: Screenshots showing strategy on chart.
    const [chartImages, setChartImages] = useState<File[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);

    useEffect(() => {
        fetchStrategies();
    }, []);

    /**
     * Retrieves all saved trading protocols for the user.
     */
    const fetchStrategies = async () => {
        try {
            const data = await strategyService.list();
            setSavedStrategies(data);
        } catch (error) {
            console.error("Failed to fetch strategies:", error);
            notify.error("Intelligence failure: Could not load strategems.");
        }
    };

    /**
     * AI SYNTHESIS TRIGGER:
     * Sends the text description to the backend where Gemini extracts 
     * a structured checklist of entry/exit rules.
     */
    const handleGenerate = async () => {
        if (!description.trim()) return;

        // ENFORCEMENT: Most traders fail by having too many strategies. 
        // We limit to 3 to force focus and mastery.
        if (!selectedStrategy && savedStrategies.length >= MAX_STRATEGIES) {
            const randomQuote = TRADING_QUOTES[Math.floor(Math.random() * TRADING_QUOTES.length)];
            setQuoteTip(randomQuote);
            setShowLimitModal(true);
            return;
        }

        setLoading(true);
        try {
            // Backend endpoint uses AI to map prose -> JSON checklist.
            const data = await strategyService.create(strategyName || 'Untitled Strategy', description);
            if (data && data.checklist_items) {
                setChecklist(data.checklist_items);
                setEditedChecklist(data.checklist_items);
                fetchStrategies();
                setSelectedStrategy(data);
                setBacktestResult(null); // Clear old simulations.
            }
        } catch (error) {
            console.error(error);
            setChecklist(["Error: Could not connect to AI. Check backend."]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * AI BACKTESTING:
     * Sends the strategy logic back to the AI for a systematic execution 
     * simulation against 2 years of historical market data.
     */
    const handleBacktest = async () => {
        if (!selectedStrategy) return;
        setBacktesting(true);
        setBacktestResult(null);
        try {
            const results = await strategyService.backtest(selectedStrategy.id);
            setBacktestResult(results); // Assuming setBacktestResult is the correct setter for backtest data
            notify.success("Intelligence Sweep Complete.");
        } catch (error) {
            console.error(error);
            notify.error("Backtest failed: Market simulation interrupted.");
        } finally {
            setBacktesting(false); // Keeping setBacktesting as per original state variable
        }
    };

    /**
     * PERSISTENCE: Saves custom modifications made to the AI-generated rules.
     */
    const handleSaveChecklist = async () => {
        if (!selectedStrategy) return;
        setSaving(true);
        try {
            const updated = await strategyService.update(selectedStrategy.id, {
                checklist_items: editedChecklist
            });
            setChecklist(updated.checklist_items);
            setSavedStrategies(prev => prev.map(s => s.id === updated.id ? updated : s));
            setIsEditing(false);
            notify.success("Protocol updated.");
        } catch (error) {
            console.error("Failed to save checklist:", error);
            notify.error("Failed to save protocol.");
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePublic = async () => {
        if (!selectedStrategy) return;
        try {
            const updated = await strategyService.update(selectedStrategy.id, {
                is_public: !selectedStrategy.is_public
            });
            setSelectedStrategy(updated);
            setSavedStrategies(prev => prev.map(s => s.id === updated.id ? updated : s));
            notify.success(updated.is_public ? "Strategy is now PUBLIC." : "Strategy is now PRIVATE.");
        } catch (error) {
            console.error("Failed to toggle public status:", error);
            notify.error("Failed to change visibility.");
        }
    };

    const handleAddItem = () => {
        setEditedChecklist([...editedChecklist, "New requirement..."]);
    };

    const handleRemoveItem = (index: number) => {
        setEditedChecklist(editedChecklist.filter((_, i) => i !== index));
    };

    const handleUpdateItem = (index: number, val: string) => {
        const updated = [...editedChecklist];
        updated[index] = val;
        setEditedChecklist(updated);
    };

    const handleDeleteStrategy = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this strategy?")) return;
        try {
            await strategyService.delete(id);
            if (selectedStrategy?.id === id) {
                setSelectedStrategy(null);
                setChecklist([]);
                setDescription('');
                setStrategyName('');
            }
            fetchStrategies();
        } catch (error) {
            console.error("Failed to delete strategy:", error);
        }
    };

    const handleSelectStrategy = (strategy: Strategy) => {
        setSelectedStrategy(strategy);
        setChecklist(strategy.checklist_items);
        setEditedChecklist(strategy.checklist_items);
        setDescription(strategy.description);
        setStrategyName(strategy.name);
        setIsEditing(false);
        setChartImages([]);
    };

    const handleChartImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const allowed = files.slice(0, 3 - chartImages.length);
        setChartImages([...chartImages, ...allowed]);
    };

    const handleRemoveChartImage = (idx: number) => {
        setChartImages(chartImages.filter((_, i) => i !== idx));
    };

    const handleUploadChartImages = async () => {
        if (!selectedStrategy || chartImages.length === 0) return;
        setUploadingImages(true);
        try {
            await strategyService.uploadChartImages(selectedStrategy.id, chartImages);
            notify.success(`${chartImages.length} chart image(s) uploaded!`);
            setChartImages([]);
            fetchStrategies();
        } catch (error) {
            console.error(error);
            notify.error('Failed to upload images');
        } finally {
            setUploadingImages(false);
        }
    };

    // Get existing chart images from selected strategy
    const existingImages = selectedStrategy ? [
        selectedStrategy.chart_image_1,
        selectedStrategy.chart_image_2,
        selectedStrategy.chart_image_3
    ].filter(Boolean) : [];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto">
            {/* Limit Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                    <div className="glass-card rounded-3xl p-10 max-w-md text-center animate-in zoom-in-95 shadow-[0_0_50px_rgba(234,179,8,0.1)]">
                        <div className="mx-auto size-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-4xl text-yellow-500">lightbulb</span>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4">Focus Over Quantity</h3>
                        <p className="text-slate-400 font-serif italic mb-8 leading-relaxed">
                            {quoteTip}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-8 px-4">
                            You already have {MAX_STRATEGIES} protocols. Master them before expanding.
                        </p>
                        <button
                            onClick={() => setShowLimitModal(false)}
                            className="w-full py-4 bg-slate-900 border border-white/5 text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-slate-800 transition-all"
                        >
                            ACKNOWLEDGED
                        </button>
                    </div>
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-4xl">psychology</span>
                        STRATEGY LAB
                    </h2>
                    <p className="text-slate-500 font-mono text-sm mt-1 uppercase tracking-widest">AI Strategy Helper v2.0</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className="text-slate-600 uppercase">Limit:</span>
                    <span className={`px-2 py-0.5 rounded ${savedStrategies.length >= MAX_STRATEGIES ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                        {savedStrategies.length}/{MAX_STRATEGIES} USED
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Saved Strategies */}
                <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Saved Strategies</h3>
                    <div className="space-y-3">
                        {savedStrategies.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => handleSelectStrategy(s)}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative group overflow-hidden ${selectedStrategy?.id === s.id
                                    ? 'border-primary bg-primary/[0.03] shadow-lg shadow-primary/5'
                                    : 'border-border bg-surface/30 hover:border-slate-700'
                                    }`}
                            >
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-8 rounded-xl flex items-center justify-center font-black text-xs ${selectedStrategy?.id === s.id ? 'bg-primary text-white' : 'bg-slate-800 text-slate-500'
                                            }`}>
                                            {s.name[0].toUpperCase()}
                                        </div>
                                        <p className={`font-black uppercase text-[11px] tracking-tight ${selectedStrategy?.id === s.id ? 'text-white' : 'text-slate-400'}`}>
                                            {s.name}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteStrategy(s.id, e)}
                                        className="material-symbols-outlined text-slate-700 hover:text-danger text-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >delete</button>
                                </div>
                                <div className="mt-2 flex gap-1">
                                    {Array.from({ length: Math.min(s.checklist_items.length, 5) }).map((_, i) => (
                                        <div key={i} className="h-0.5 w-3 bg-slate-800 rounded-full"></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {savedStrategies.length === 0 && (
                            <div className="p-8 text-center glass-card rounded-3xl border-dashed">
                                <span className="material-symbols-outlined text-slate-800 text-4xl mb-2">folder_off</span>
                                <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest leading-relaxed">No strategies saved yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: AI Workspace */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <span className="material-symbols-outlined text-9xl">auto_fix</span>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Strategy Name</label>
                                    <input
                                        type="text"
                                        value={strategyName}
                                        onChange={(e) => setStrategyName(e.target.value)}
                                        className="terminal-input w-full"
                                        placeholder="E.g. Moving Average Crossover..."
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-1">
                                    {selectedStrategy && (
                                        <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 p-3 rounded-2xl">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Public Sharing</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{selectedStrategy.is_public ? 'Active on Profile' : 'Private'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {selectedStrategy.is_public && (
                                                    <a
                                                        href={`/u/${useAuthStore.getState().user?.username}`}
                                                        target="_blank"
                                                        className="size-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
                                                        title="View Public Profile"
                                                    >
                                                        <span className="material-symbols-outlined">visibility</span>
                                                    </a>
                                                )}
                                                <button
                                                    onClick={handleTogglePublic}
                                                    className={`size-10 rounded-xl flex items-center justify-center transition-all ${selectedStrategy.is_public ? 'bg-success text-white shadow-lg shadow-success/20' : 'bg-slate-800 text-slate-500'}`}
                                                >
                                                    <span className="material-symbols-outlined">{selectedStrategy.is_public ? 'public' : 'public_off'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Your Strategy Plan</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="terminal-input w-full h-40 resize-none pt-4 leading-relaxed"
                                    placeholder="Explain your trade setup... (e.g. I buy when price is above the 200 EMA and the RSI is below 30...)"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={loading || !description}
                                className={`w-full btn-primary group relative overflow-hidden ${loading ? 'opacity-50' : ''}`}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    <span className={`material-symbols-outlined ${loading ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`}>
                                        {loading ? 'sync' : 'bolt'}
                                    </span>
                                    {loading ? 'AI IS BUILDING YOUR RULES...' : 'CREATE TRADE CHECKLIST'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Result Interface */}
                    {checklist.length > 0 && (
                        <div className="animate-in slide-in-from-bottom-4 duration-700 bg-surface border border-border rounded-3xl p-10 shadow-2xl">
                            <div className="flex justify-between items-center mb-10 border-b border-border pb-6">
                                <h4 className="text-xl font-black text-white tracking-widest uppercase">
                                    {isEditing ? 'Customize Your Rules' : 'Your AI Rules'}
                                </h4>
                                <div className="flex gap-4">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={handleAddItem}
                                                className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                                Add Rule
                                            </button>
                                            <button
                                                onClick={handleSaveChecklist}
                                                disabled={saving}
                                                className={`px-6 py-2 bg-success text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all ${saving ? 'opacity-50' : ''}`}
                                            >
                                                {saving ? 'Saving...' : 'Save Rules'}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit_note</span>
                                            Customize Rules
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {(isEditing ? editedChecklist : checklist).map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-6 p-5 rounded-2xl bg-[#050507] border border-border group hover:border-slate-700 transition-all"
                                    >
                                        <div className="flex-shrink-0 size-8 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                                            {idx + 1}
                                        </div>
                                        {isEditing ? (
                                            <div className="flex-1 flex gap-4 items-center">
                                                <input
                                                    type="text"
                                                    value={item}
                                                    onChange={(e) => handleUpdateItem(idx, e.target.value)}
                                                    className="flex-1 bg-transparent border-none text-white font-medium focus:ring-0 p-0"
                                                />
                                                <button
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="material-symbols-outlined text-slate-700 hover:text-danger text-lg"
                                                >delete</button>
                                            </div>
                                        ) : (
                                            <p className="text-slate-300 font-medium leading-relaxed group-hover:text-white transition-colors">{item}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {!isEditing && (
                                <div className="mt-10 p-6 bg-primary/5 border border-primary/10 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
                                        </div>
                                        <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">
                                            AI Strategy Validator is Online.
                                        </p>
                                    </div>
                                    <button
                                        className={`btn-primary py-2.5 px-6 text-[10px] flex items-center gap-2 ${backtesting ? 'opacity-50 animate-pulse' : ''}`}
                                        onClick={handleBacktest}
                                        disabled={backtesting}
                                    >
                                        <span className="material-symbols-outlined text-lg">precision_manufacturing</span>
                                        {backtesting ? 'AI ROBOT IS TRADING...' : 'RUN BACKTEST ROBOT'}
                                    </button>
                                </div>
                            )}

                            {/* Backtest Results Card */}
                            {backtestResult && (
                                <div className="mt-12 animate-in slide-in-from-top-4 duration-700">
                                    <div className="p-8 border-2 border-primary/20 bg-primary/[0.02] rounded-[32px] shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <span className="material-symbols-outlined text-9xl">analytics</span>
                                        </div>

                                        <div className="flex justify-between items-start mb-8 relative z-10">
                                            <div>
                                                <h5 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary">analytics</span>
                                                    Systematic 2-Year Analysis
                                                </h5>
                                                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                                                    Scope: {backtestResult.test_period?.start} — {backtestResult.test_period?.end} ({backtestResult.test_period?.total_candles} Candles Analyzed)
                                                </p>
                                            </div>
                                            <div className="px-4 py-2 bg-slate-900 border border-white/5 rounded-xl">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Bench vs BTC:</span>
                                                <span className={`text-[10px] font-black uppercase ${backtestResult.benchmark_diff >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {backtestResult.benchmark_diff >= 0 ? '+' : ''}{backtestResult.benchmark_diff}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-8">
                                            <div className="p-6 glass-card rounded-2xl border-white/5">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">2-Year Win Rate</p>
                                                <p className="text-3xl font-mono font-black text-white">{backtestResult.win_rate}%</p>
                                            </div>
                                            <div className="p-6 glass-card rounded-2xl border-white/5">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Net Systematic Profit</p>
                                                <p className={`text-3xl font-mono font-black ${backtestResult.total_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {backtestResult.total_profit}%
                                                </p>
                                            </div>
                                            <div className="p-6 glass-card rounded-2xl border-white/5">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Trades Calculated</p>
                                                <p className="text-3xl font-mono font-black text-primary">{backtestResult.total_trades}</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 space-y-4">
                                            <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Simulation Representative Log</h6>
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {backtestResult.trade_log?.map((trade: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center p-4 bg-[#050507]/60 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${trade.type === 'LONG' || trade.type === 'BUY' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                                                {trade.type}
                                                            </div>
                                                            <span className="text-[10px] font-mono text-slate-500">{trade.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <span className="text-[10px] font-mono text-white font-bold">${trade.price}</span>
                                                            <span className={`text-[10px] font-mono font-black ${trade.result === 'WIN' || trade.pnl > 0 ? 'text-success' : 'text-danger'}`}>
                                                                {trade.pnl > 0 ? '+' : ''}{trade.pnl}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
                                            <p className="text-[10px] text-slate-400 font-serif italic text-center leading-relaxed px-10">
                                                "{backtestResult.summary}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Chart Screenshots Section */}
                            <div className="mt-10 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-lg">insert_photo</span>
                                        How It Looks on Chart
                                    </h3>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{existingImages.length + chartImages.length}/3 Images</span>
                                </div>

                                <p className="text-[10px] text-slate-600 italic">Upload up to 3 screenshots showing what your strategy looks like on the chart.</p>

                                {/* Existing Images */}
                                <div className="grid grid-cols-3 gap-4">
                                    {existingImages.map((img, idx) => (
                                        <div key={idx} className="relative group rounded-2xl overflow-hidden border-2 border-white/10 hover:border-primary/50 transition-all">
                                            <img src={img as string} alt={`Chart ${idx + 1}`} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-[10px] text-white font-bold uppercase">Saved</span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* New Images to Upload */}
                                    {chartImages.map((file, idx) => (
                                        <div key={`new-${idx}`} className="relative group rounded-2xl overflow-hidden border-2 border-primary/50">
                                            <img src={URL.createObjectURL(file)} alt={`New ${idx + 1}`} className="w-full h-28 object-cover" />
                                            <button
                                                onClick={() => handleRemoveChartImage(idx)}
                                                className="absolute top-2 right-2 size-6 bg-danger rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <span className="material-symbols-outlined text-white text-sm">close</span>
                                            </button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-primary/90 py-1 text-center">
                                                <span className="text-[9px] text-white font-bold uppercase">New</span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Button */}
                                    {existingImages.length + chartImages.length < 3 && (
                                        <label className="cursor-pointer group">
                                            <div className="h-28 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-primary/50 transition-all">
                                                <span className="material-symbols-outlined text-slate-600 group-hover:text-primary text-2xl">add_photo_alternate</span>
                                                <span className="text-[9px] text-slate-600 group-hover:text-primary font-bold uppercase">Add Image</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleChartImageSelect}
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* Upload Button */}
                                {chartImages.length > 0 && (
                                    <button
                                        onClick={handleUploadChartImages}
                                        disabled={uploadingImages}
                                        className="w-full py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {uploadingImages ? 'Uploading...' : `Upload ${chartImages.length} Image${chartImages.length > 1 ? 's' : ''}`}
                                    </button>
                                )}
                            </div>
                        </div>

                    )}
                </div>
            </div>
        </div>
    );
};

export default StrategyBuilder;

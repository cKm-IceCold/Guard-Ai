import { useState, useEffect } from 'react';
import { strategyService } from '../services/endpoints';

interface Strategy {
    id: number;
    name: string;
    description: string;
    checklist_items: string[];
    created_at: string;
}

const MAX_STRATEGIES = 3;
const TRADING_QUOTES = [
    "\"The goal of a successful trader is to make the best trades. Money is secondary.\" — Alexander Elder",
    "\"Trade your plan, plan your trade. Master a few setups, not many.\" — Linda Raschke",
    "\"It is better to be a master of one than a jack of all trades.\" — Ancient Wisdom",
    "\"Simplicity is the ultimate sophistication.\" — Leonardo da Vinci"
];

const StrategyBuilder = () => {
    const [description, setDescription] = useState('');
    const [strategyName, setStrategyName] = useState('');
    const [loading, setLoading] = useState(false);
    const [checklist, setChecklist] = useState<string[]>([]);
    const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [quoteTip, setQuoteTip] = useState('');

    useEffect(() => {
        fetchStrategies();
    }, []);

    const fetchStrategies = async () => {
        try {
            const data = await strategyService.list();
            setSavedStrategies(data);
        } catch (error) {
            console.error("Failed to fetch strategies:", error);
        }
    };

    const handleGenerate = async () => {
        if (!description.trim()) return;

        // Check limit before creating new strategy (only for NEW, not re-generate)
        if (!selectedStrategy && savedStrategies.length >= MAX_STRATEGIES) {
            const randomQuote = TRADING_QUOTES[Math.floor(Math.random() * TRADING_QUOTES.length)];
            setQuoteTip(randomQuote);
            setShowLimitModal(true);
            return;
        }

        setLoading(true);
        try {
            const data = await strategyService.create(strategyName || 'Untitled Strategy', description);
            if (data && data.checklist_items) {
                setChecklist(data.checklist_items);
                fetchStrategies();
                setSelectedStrategy(data);
            }
        } catch (error) {
            console.error(error);
            setChecklist(["Error: Could not connect to AI. Check backend."]);
        } finally {
            setLoading(false);
        }
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
        setDescription(strategy.description);
        setStrategyName(strategy.name);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Limit Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface border border-[#27272a] rounded-2xl p-8 max-w-md text-center animate-in zoom-in-95">
                        <span className="material-symbols-outlined text-5xl text-yellow-500 mb-4">lightbulb</span>
                        <h3 className="text-xl font-bold text-white mb-2">Master Few, Not Many</h3>
                        <p className="text-slate-400 mb-4">
                            You have reached the maximum of {MAX_STRATEGIES} strategies. The best traders master a few setups perfectly.
                        </p>
                        <blockquote className="text-sm italic text-blue-400 border-l-2 border-primary pl-4 my-4 text-left">
                            {quoteTip}
                        </blockquote>
                        <p className="text-xs text-slate-500 mb-6">Delete an existing strategy to create a new one.</p>
                        <button
                            onClick={() => setShowLimitModal(false)}
                            className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            <header>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                    Strategy Lab
                </h2>
                <p className="text-slate-400">Generate & manage your trading checklists (Max {MAX_STRATEGIES})</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Saved Strategies Sidebar */}
                <div className="lg:col-span-1 bg-surface border border-[#27272a] rounded-2xl p-4 h-fit">
                    <h3 className="font-semibold text-slate-300 mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-500 text-lg">folder_open</span>
                            My Strategies
                        </span>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                            {savedStrategies.length}/{MAX_STRATEGIES}
                        </span>
                    </h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {savedStrategies.length > 0 ? (
                            savedStrategies.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => handleSelectStrategy(s)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group relative ${selectedStrategy?.id === s.id
                                            ? 'border-primary bg-primary/10 text-white'
                                            : 'border-[#27272a] bg-[#0a0a0c] text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    <button
                                        onClick={(e) => handleDeleteStrategy(s.id, e)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded-lg"
                                        title="Delete strategy"
                                    >
                                        <span className="material-symbols-outlined text-red-500 text-sm">delete</span>
                                    </button>
                                    <p className="font-medium text-sm truncate pr-6">{s.name}</p>
                                    <p className="text-xs text-slate-500 mt-1 truncate">{s.description}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-600 text-center py-4">No strategies yet.</p>
                        )}
                    </div>
                </div>

                {/* Main Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Input Section */}
                    <div className="bg-surface border border-[#27272a] rounded-2xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Strategy Name</label>
                                <input
                                    type="text"
                                    value={strategyName}
                                    onChange={(e) => setStrategyName(e.target.value)}
                                    placeholder="e.g., RSI Bounce Setup"
                                    className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Describe your strategy</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., I want to buy when RSI is oversold and price bounces off the Bollinger Band..."
                            className="w-full h-32 bg-[#0a0a0c] border border-[#27272a] rounded-xl p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary resize-none"
                        />
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !description}
                                className="bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                        {selectedStrategy ? 'Re-Generate' : 'Generate & Save'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Output Section */}
                    <div className="bg-surface border border-[#27272a] rounded-2xl p-6">
                        <h3 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-500">checklist</span>
                            Generated Protocol
                            {selectedStrategy && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">{selectedStrategy.name}</span>}
                        </h3>
                        <div className="bg-[#0a0a0c] rounded-xl overflow-hidden border border-[#27272a]">
                            {checklist.length > 0 ? (
                                <div className="divide-y divide-[#27272a]">
                                    {checklist.map((item, idx) => (
                                        <div key={idx} className="p-4 flex items-start gap-3 hover:bg-white/5 transition-colors">
                                            <div className="mt-0.5 size-5 border-2 border-slate-600 rounded flex items-center justify-center shrink-0">
                                                <span className="text-[10px] font-bold text-transparent">✓</span>
                                            </div>
                                            <p className="text-slate-300 text-sm leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center p-8 text-center opacity-50">
                                    <span className="material-symbols-outlined text-4xl text-slate-600 mb-3">psychology</span>
                                    <p className="text-sm text-slate-500">Select a strategy or generate a new one.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StrategyBuilder;

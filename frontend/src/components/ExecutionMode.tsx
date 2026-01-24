import { useState, useEffect } from 'react';
import { strategyService, journalService } from '../services/endpoints';

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
    const [showLogModal, setShowLogModal] = useState(false);
    
    // Log Form State
    const [result, setResult] = useState<'WIN' | 'LOSS'>('WIN');
    const [pnl, setPnl] = useState('0');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchStrategies = async () => {
            try {
                const data = await strategyService.list();
                setStrategies(data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchStrategies();
    }, []);

    useEffect(() => {
        if (selectedStrategy) {
            setCheckedItems(new Array(selectedStrategy.checklist_items.length).fill(false));
            setIsUnlocked(false);
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
        const updated = [...checkedItems];
        updated[index] = !updated[index];
        setCheckedItems(updated);
    };

    const handleLogTrade = async () => {
        if (!selectedStrategy) return;
        setLoading(true);
        try {
            await journalService.logTrade(
                selectedStrategy.id,
                result,
                parseFloat(pnl),
                notes,
                isUnlocked
            );
            setShowLogModal(false);
            onTradeLogged();
        } catch (error) {
            console.error("Failed to log trade:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Log Trade Modal */}
            {showLogModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface border border-[#27272a] rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-white mb-6">Log Strategy Result</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Outcome</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setResult('WIN')}
                                        className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                                            result === 'WIN' ? 'border-success bg-success/10 text-success' : 'border-[#27272a] text-slate-500'
                                        }`}
                                    >WIN</button>
                                    <button 
                                        onClick={() => setResult('LOSS')}
                                        className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                                            result === 'LOSS' ? 'border-danger bg-danger/10 text-danger' : 'border-[#27272a] text-slate-500'
                                        }`}
                                    >LOSS</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">P&L (USD)</label>
                                <input 
                                    type="number"
                                    value={pnl}
                                    onChange={(e) => setPnl(e.target.value)}
                                    className="w-full bg-[#0a0a0c] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => setShowLogModal(false)}
                                    className="flex-1 py-3 text-slate-400 font-bold hover:text-white"
                                >Cancel</button>
                                <button 
                                    onClick={handleLogTrade}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save to Journal'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-success">verified_user</span>
                    Execution Mode
                </h2>
                <p className="text-slate-400">Validate checklist to log a trade</p>
            </header>

            <div className="bg-surface border border-[#27272a] rounded-2xl p-6">
                <label className="block text-sm font-semibold text-slate-300 mb-3">Protocol Selection</label>
                <div className="flex flex-wrap gap-2">
                    {strategies.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedStrategy(s)}
                            className={`px-4 py-2 rounded-xl border transition-all text-xs font-bold ${
                                selectedStrategy?.id === s.id ? 'border-primary bg-primary/10 text-primary' : 'border-[#27272a] text-slate-500'
                            }`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>

            {selectedStrategy && (
                <div className="bg-surface border border-[#27272a] rounded-2xl p-6">
                    <div className="space-y-3 mb-8">
                        {selectedStrategy.checklist_items.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleToggleItem(idx)}
                                className={`w-full text-left p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                                    checkedItems[idx] ? 'border-success bg-success/10' : 'border-[#27272a]'
                                }`}
                            >
                                <div className={`size-6 rounded flex items-center justify-center ${checkedItems[idx] ? 'bg-success text-white' : 'border-2 border-slate-600'}`}>
                                    {checkedItems[idx] && <span className="material-symbols-outlined text-xs font-bold">check</span>}
                                </div>
                                <span className={`text-sm ${checkedItems[idx] ? 'text-success' : 'text-slate-300'}`}>{item}</span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowLogModal(true)}
                        disabled={!isUnlocked}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                            isUnlocked ? 'bg-success text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        {isUnlocked ? 'ENTER & LOG TRADE' : 'COMPLETE CHECKLIST'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExecutionMode;

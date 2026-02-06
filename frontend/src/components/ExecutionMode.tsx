import { useState, useEffect } from 'react';
import { strategyService, journalService, riskService } from '../services/endpoints';

interface CustomRule {
    id: number;
    title: string;
    description: string;
    image_example?: string;
}

interface Strategy {
    id: number;
    name: string;
    description: string;
    checklist_items: string[];
    custom_rules?: CustomRule[];
    chart_image_1?: string;
    chart_image_2?: string;
    chart_image_3?: string;
}

/**
 * ExecutionMode Component
 * 
 * The core 'Guard' interface where trading happens.
 * Features:
 * 1. Strategy Selection: Choose a predefined protocol.
 * 2. Mandatory Checklist: Users must check every AI-generated rule to 'unlock' the trade entry.
 * 3. Terminal Protection: Integration with Risk Service to block entries if account is locked.
 * 4. Image Reference: Side-by-side view of chart screenshots for pattern matching.
 */
const ExecutionMode = ({ onTradeLogged }: { onTradeLogged: () => void }) => {
    // SYSTEM STATE: Live connections to the Risk Engine and User Strategies.
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

    // GUARD STATE: Tracks checklist completion. 
    // `isUnlocked` is only true when every item in `checkedItems` is true.
    const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
    const [isUnlocked, setIsUnlocked] = useState(false);

    // RISK STATE: Live status of the Terminal Lock.
    const [riskStatus, setRiskStatus] = useState<{ allowed: boolean, reason?: string }>({ allowed: true });

    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const [stratData, riskProfile] = await Promise.all([
                    strategyService.list(),
                    riskService.getProfile()
                ]);
                setStrategies(stratData);

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
            await journalService.openTrade(selectedStrategy.id, true);
            setSuccessMessage(true);
            setIsUnlocked(false);
            setCheckedItems(new Array(selectedStrategy.checklist_items.length).fill(false));
            setTimeout(() => {
                onTradeLogged();
            }, 2000);
        } catch (error) {
            console.error("Failed to enter trade:", error);
        } finally {
            setLoading(false);
        }
    };

    // Get all images (custom rules + the 3 chart screenshots)
    const strategyImages = [
        ...(selectedStrategy?.custom_rules?.filter(r => r.image_example).map(r => ({ url: r.image_example, title: r.title, desc: r.description })) || []),
        ...(selectedStrategy?.chart_image_1 ? [{ url: selectedStrategy.chart_image_1, title: 'Chart Ref 1', desc: 'Primary chart setup' }] : []),
        ...(selectedStrategy?.chart_image_2 ? [{ url: selectedStrategy.chart_image_2, title: 'Chart Ref 2', desc: 'Secondary chart setup' }] : []),
        ...(selectedStrategy?.chart_image_3 ? [{ url: selectedStrategy.chart_image_3, title: 'Chart Ref 3', desc: 'Tertiary chart setup' }] : []),
    ];

    if (!riskStatus.allowed) {
        return (
            <div className="max-w-xl mx-auto mt-20 p-12 glass-card border-2 border-danger/30 rounded-[40px] text-center space-y-6 animate-in zoom-in-95 duration-700 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                <div className="mx-auto size-24 bg-danger/10 rounded-[32px] flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-6xl text-danger animate-pulse">lock_person</span>
                </div>
                <h2 className="text-3xl font-black text-text-main uppercase tracking-tighter italic">Trading Locked</h2>
                <div className="bg-danger/10 border border-danger/20 py-2 px-4 rounded-xl inline-block">
                    <p className="text-danger font-mono text-xs font-black uppercase tracking-widest">{riskStatus.reason}</p>
                </div>
                <p className="text-text-dim text-sm leading-relaxed max-w-sm mx-auto font-medium">
                    The Risk Manager has disabled trading to protect your account.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4 backdrop-blur-md cursor-pointer"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] animate-in zoom-in-95">
                        <img src={selectedImage} alt="Strategy Reference" className="rounded-2xl max-h-[90vh] object-contain shadow-2xl" />
                        <button
                            className="absolute top-4 right-4 size-10 bg-black/50 rounded-full flex items-center justify-center text-text-main hover:bg-black/70"
                            onClick={() => setSelectedImage(null)}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-success text-4xl">play_circle</span>
                        TAKE A TRADE
                    </h2>
                    <p className="text-text-dim font-mono text-sm mt-1 uppercase tracking-widest">Active Checklist v3.0</p>
                </div>
            </header>

            {successMessage && (
                <div className="bg-success/10 border-2 border-success/20 p-8 rounded-3xl flex items-center gap-6 animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-success/5">
                    <div className="size-14 bg-success rounded-2xl flex items-center justify-center text-text-main shadow-lg shadow-success/20">
                        <span className="material-symbols-outlined text-3xl font-black">verified</span>
                    </div>
                    <div>
                        <h4 className="font-black text-text-main uppercase tracking-tighter text-lg">Trade Logged</h4>
                        <p className="text-xs text-success/70 font-bold uppercase tracking-widest">Checklist verified. Good luck!</p>
                    </div>
                </div>
            )}

            <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-4 px-1">Select Your Strategy</h3>
                <div className="flex flex-wrap gap-3 relative z-10">
                    {strategies.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedStrategy(s)}
                            className={`px-6 py-3 rounded-2xl border-2 transition-all text-[11px] font-black uppercase tracking-tight ${selectedStrategy?.id === s.id
                                ? 'border-primary bg-primary/10 text-text-main shadow-lg shadow-primary/10'
                                : 'border-border bg-surface text-text-dim hover:border-slate-700'
                                }`}
                        >
                            {s.name}
                        </button>
                    ))}
                    {strategies.length === 0 && (
                        <p className="text-xs text-text-dim font-mono px-1">No strategies found. Go to Strategy Lab to create one.</p>
                    )}
                </div>
            </div>

            {selectedStrategy && (
                <div className="glass-card rounded-[40px] p-12 shadow-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-text-main flex items-center gap-3">
                                <span className="material-symbols-outlined text-text-dim text-3xl">checklist</span>
                                {selectedStrategy.name}
                            </h3>
                            <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] mt-2">Before Entering Trade</p>
                        </div>
                    </div>

                    {/* Strategy Visual References */}
                    {strategyImages.length > 0 && (
                        <div className="mb-10 relative z-10">
                            <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">image</span>
                                Visual Reference
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {strategyImages.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="group/img cursor-pointer relative overflow-hidden rounded-2xl border-2 border-white/5 hover:border-primary/50 transition-all"
                                        onClick={() => setSelectedImage(img.url!)}
                                    >
                                        <img
                                            src={img.url}
                                            alt={img.title}
                                            className="w-full h-32 object-cover group-hover/img:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity">
                                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                                <p className="text-xs font-black text-text-main uppercase tracking-tight">{img.title}</p>
                                                <p className="text-[9px] text-text-dim line-clamp-1">{img.desc}</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-2 right-2 size-8 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-text-main text-sm">zoom_in</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 max-w-3xl relative z-10">
                        {selectedStrategy.checklist_items.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleToggleItem(idx)}
                                className={`w-full text-left p-5 rounded-3xl border-2 flex items-center gap-6 transition-all duration-300 transform active:scale-[0.99] ${checkedItems[idx]
                                    ? 'border-success bg-success/[0.03] shadow-lg shadow-success/5'
                                    : 'border-border bg-background/40 hover:border-slate-700'
                                    }`}
                            >
                                <div className={`size-8 rounded-xl border-2 flex items-center justify-center transition-all ${checkedItems[idx] ? 'bg-success border-success text-black shadow-lg shadow-success/20' : 'border-border bg-surface/50'
                                    }`}>
                                    {checkedItems[idx] && <span className="material-symbols-outlined text-lg font-black">check</span>}
                                </div>
                                <span className={`text-sm font-bold tracking-tight ${checkedItems[idx] ? 'text-text-main' : 'text-text-dim'}`}>
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
                                ? 'bg-success hover:bg-green-600 text-black shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)] hover:-translate-y-1'
                                : 'bg-surface/50 border border-border text-text-dim cursor-not-allowed'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-2xl ${isUnlocked ? 'animate-glide' : ''}`}>
                                {isUnlocked ? 'lock_open' : 'lock'}
                            </span>
                            {loading ? 'PROCESSING...' : (isUnlocked ? 'START TRADE' : 'FINISH CHECKLIST')}
                        </button>
                        <p className="mt-6 text-[9px] text-text-dim font-mono uppercase tracking-widest opacity-60">
                            Always follow your plan.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExecutionMode;


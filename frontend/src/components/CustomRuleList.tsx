import React, { useState } from 'react';
import { strategyService } from '../services/endpoints';
import { notify } from './NotificationProvider';

interface CustomRule {
    id: number;
    title: string;
    description: string;
    image_example?: string;
}

interface CustomRuleListProps {
    strategyId: number;
    rules: CustomRule[];
    onUpdate: () => void;
}

const CustomRuleList: React.FC<CustomRuleListProps> = ({ strategyId, rules, onUpdate }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newRule, setNewRule] = useState({ title: '', description: '' });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('strategy', strategyId.toString());
            formData.append('title', newRule.title);
            formData.append('description', newRule.description);
            if (imageFile) formData.append('image_example', imageFile);

            await strategyService.createCustomRule(formData);

            notify.success("New rule protocol established.");
            setNewRule({ title: '', description: '' });
            setImageFile(null);
            setIsAdding(false);
            onUpdate();
        } catch (error) {
            console.error(error);
            notify.error("Protocol Error: Rule registration failed.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="mt-8 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Custom Visual Rules</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">{isAdding ? 'close' : 'add_photo_alternate'}</span>
                    {isAdding ? 'Cancel' : 'Add Visual Rule'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="glass-card p-6 border-primary/20 bg-primary/[0.02] animate-in zoom-in-95 duration-300">
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Rule Title (e.g. Double Bottom)"
                            className="terminal-input w-full"
                            value={newRule.title}
                            onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                            required
                        />
                        <textarea
                            placeholder="Describe the visual pattern..."
                            className="terminal-input w-full h-24 resize-none"
                            value={newRule.description}
                            onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                            required
                        />
                        <div className="flex items-center gap-4">
                            <label className="flex-1 cursor-pointer group">
                                <div className="p-4 border-2 border-dashed border-white/5 rounded-2xl group-hover:border-primary/50 transition-all flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-600 group-hover:text-primary">upload_file</span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase">{imageFile ? imageFile.name : 'Upload Example Image'}</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                        accept="image/*"
                                    />
                                </div>
                            </label>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-opacity-90 transition-all disabled:opacity-50"
                            >
                                {uploading ? 'UPLOADING...' : 'SAVE RULE'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule) => (
                    <div key={rule.id} className="glass-card overflow-hidden group border-white/5 hover:border-primary/30 transition-all">
                        {rule.image_example && (
                            <div className="h-40 overflow-hidden relative">
                                <img src={rule.image_example} alt={rule.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                            </div>
                        )}
                        <div className="p-4">
                            <h4 className="text-xs font-black text-white uppercase tracking-tighter mb-1">{rule.title}</h4>
                            <p className="text-[10px] text-slate-500 italic font-serif leading-relaxed line-clamp-2">{rule.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomRuleList;

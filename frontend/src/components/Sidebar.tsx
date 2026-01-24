
const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
        { id: 'strategy', label: 'Strategy Lab', icon: 'psychology' },
        { id: 'execution', label: 'Execution', icon: 'play_circle' },
        { id: 'journal', label: 'Trade Journal', icon: 'book' },
        { id: 'risk', label: 'Risk Guardian', icon: 'shield' },
    ];

    return (
        <aside className="w-64 bg-surface border-r border-[#27272a] hidden md:flex flex-col h-full">
            <div className="p-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                    Guard AI
                </h1>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Ledger v1.0</p>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5'
                                : 'text-slate-500 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                        <span className="font-bold text-xs uppercase tracking-tight">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-[#27272a]">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="size-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border border-[#27272a]">
                        OP
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-white">OPERATOR</p>
                        <div className="flex items-center gap-1.5">
                             <div className="size-1.5 rounded-full bg-success animate-pulse"></div>
                             <p className="text-[10px] text-slate-500 font-mono">ENCRYPTED</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

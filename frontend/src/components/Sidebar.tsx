import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
    const { logout } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const menuItems = [
        { id: 'dashboard', icon: 'dashboard', label: 'Command Center' },
        { id: 'risk', icon: 'gpp_maybe', label: 'Risk Guardian' },
        { id: 'strategy', icon: 'psychology', label: 'Strategy Lab' },
        { id: 'execution', icon: 'checklist_rtl', label: 'Execution Mode' },
        { id: 'journal', icon: 'history_edu', label: 'Trade Journal' },
        { id: 'analytics', icon: 'monitoring', label: 'Psychology' },
        { id: 'broker', icon: 'link', label: 'Broker Connect' },
    ];

    const handleTabChange = (id: string) => {
        setActiveTab(id);
        setIsMobileOpen(false); // Auto-close on mobile
    };

    return (
        <>
            {/* Mobile Header/Toggle */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-xl">shield</span>
                    </div>
                    <span className="font-black text-white text-sm tracking-tighter italic">GUARD AI</span>
                </div>
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-white">
                        {isMobileOpen ? 'close' : 'menu'}
                    </span>
                </button>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Main Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-[70]
                w-72 bg-[#050507] border-r border-white/5 flex flex-col h-full
                transition-transform duration-500 ease-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Logo Section */}
                <div className="p-8 pb-12">
                    <div className="flex items-center gap-4 group cursor-default">
                        <div className="size-12 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10 group-hover:scale-105 transition-all">
                            <span className="material-symbols-outlined text-primary text-3xl font-light">shield</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tighter italic leading-none">GUARD AI</h1>
                            <p className="text-[9px] text-slate-600 font-mono tracking-widest mt-1">TERM_V1.5</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`
                                w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative
                                ${activeTab === item.id
                                    ? 'bg-primary text-black font-black shadow-lg shadow-primary/20'
                                    : 'text-slate-500 hover:bg-white/5 hover:text-white'}
                            `}
                        >
                            <span className={`material-symbols-outlined text-2xl ${activeTab === item.id ? 'text-black' : 'group-hover:text-primary transition-colors'}`}>
                                {item.icon}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.2em]">{item.label}</span>

                            {activeTab === item.id && (
                                <div className="absolute right-4 size-1.5 rounded-full bg-black"></div>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Footer / Logout */}
                <div className="p-6 border-t border-white/5 space-y-4">
                    <button
                        onClick={() => logout()}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:bg-danger/10 hover:text-danger transition-all group"
                    >
                        <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">logout</span>
                        <span className="text-[11px] uppercase tracking-[0.2em]">Terminate</span>
                    </button>
                    <div className="px-6 py-4 rounded-2xl bg-slate-900/50 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="size-2 rounded-full bg-success animate-pulse"></div>
                            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Enforcement Live</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;

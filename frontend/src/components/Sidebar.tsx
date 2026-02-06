import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isVisible: boolean;
    setIsVisible: (visible: boolean) => void;
}

const Sidebar = ({ activeTab, setActiveTab, isVisible, setIsVisible }: SidebarProps) => {
    const { logout } = useAuthStore();
    const { theme, toggleTheme } = useTheme();

    const menuItems = [
        { id: 'dashboard', icon: 'dashboard', label: 'Home' },
        { id: 'risk', icon: 'gpp_maybe', label: 'Risk Guardian' },
        { id: 'strategy', icon: 'psychology', label: 'My Strategies' },
        { id: 'execution', icon: 'checklist_rtl', label: 'Execution Mode' },
        { id: 'journal', icon: 'history_edu', label: 'Trade Journal' },
        { id: 'analytics', icon: 'monitoring', label: 'Psychology' },
        { id: 'broker', icon: 'link', label: 'Connect Broker' },
    ];

    const handleTabChange = (id: string) => {
        setActiveTab(id);
        if (window.innerWidth < 768) setIsVisible(false); // Auto-close on mobile only
    };

    return (
        <>
            {/* Mobile Header/Toggle */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-xl">shield</span>
                    </div>
                    <span className="font-black text-text-main text-sm tracking-tighter italic">GUARD AI</span>
                </div>
                <button
                    onClick={() => setIsVisible(!isVisible)}
                    className="size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-text-main">
                        {isVisible ? 'close' : 'menu'}
                    </span>
                </button>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {isVisible && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden transition-opacity"
                    onClick={() => setIsVisible(false)}
                />
            )}

            {/* Main Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-[70]
                w-72 bg-background border-r border-border flex flex-col h-full
                transition-all duration-500 ease-in-out
                ${isVisible ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Desktop/Global Toggle Button (positioned inside sidebar when open) */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute -right-12 top-6 size-10 hidden md:flex items-center justify-center rounded-r-xl bg-background border border-l-0 border-border text-slate-500 hover:text-text-main transition-colors"
                >
                    <span className="material-symbols-outlined">menu_open</span>
                </button>

                {/* Logo Section */}
                <div className="p-8 pb-12">
                    <div className="flex items-center gap-4 group cursor-default">
                        <div className="size-12 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10 group-hover:scale-105 transition-all">
                            <span className="material-symbols-outlined text-primary text-3xl font-light">shield</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-text-main tracking-tighter italic leading-none">GUARD AI</h1>
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
                                    : 'text-slate-500 hover:bg-surface/5 hover:text-text-main'}
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

                {/* Footer / Themes / Logout */}
                <div className="p-6 border-t border-border space-y-4">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:bg-primary/10 hover:text-primary transition-all group"
                    >
                        <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform">
                            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.2em]">
                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                        </span>
                    </button>

                    <button
                        onClick={() => logout()}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:bg-danger/10 hover:text-danger transition-all group"
                    >
                        <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">logout</span>
                        <span className="text-[11px] uppercase tracking-[0.2em]">Logout</span>
                    </button>
                    <div className="px-6 py-4 rounded-2xl bg-surface/50 border border-border">
                        <div className="flex items-center gap-3">
                            <div className="size-2 rounded-full bg-success animate-pulse"></div>
                            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">System Active</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Desktop Toggle Reveal Button (OUTSIDE aside so it's always visible) */}
            {!isVisible && (
                <button
                    onClick={() => setIsVisible(true)}
                    className="fixed left-0 top-6 size-10 hidden md:flex items-center justify-center rounded-r-xl bg-background border border-l-0 border-border text-slate-500 hover:text-text-main transition-colors z-[80]"
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
            )}
        </>
    );
};

export default Sidebar;

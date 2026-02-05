import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicService } from '../services/endpoints';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PublicProfileData {
    username: string;
    joined_at: string;
    bio: string;
    stats: {
        total_trades: number;
        win_rate: number;
        net_profit: number;
    };
    equity_curve: { date: string, pnl: number }[];
    strategies: {
        id: number;
        name: string;
        description: string;
        checklist_items: string[];
    }[];
}

const PublicProfile = () => {
    const { username } = useParams();
    const [data, setData] = useState<PublicProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (username) {
                    const profileData = await publicService.getProfile(username);
                    setData(profileData);
                }
            } catch (err) {
                setError('Trader profile not found or private.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [username]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div className="min-h-screen bg-[#050507] flex items-center justify-center">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center text-center p-8">
            <span className="material-symbols-outlined text-zinc-800 text-9xl mb-4">person_off</span>
            <h1 className="text-3xl font-black text-white">Profile Not Found</h1>
            <p className="text-slate-500 mt-2">{error}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050507] text-white font-sans selection:bg-primary/30 pb-20">
            {/* Header / Nav */}
            <nav className="border-b border-white/5 py-4 px-8 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="size-8 bg-gradient-to-tr from-blue-600 to-violet-600 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-900/20">
                        G
                    </div>
                    <span className="font-bold tracking-tight text-lg">Guard AI</span>
                </div>
                <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-bold transition-all border border-primary/20"
                >
                    <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'share'}</span>
                    {copied ? 'Copied!' : 'Share Results'}
                </button>
            </nav>

            <main className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-start justify-between gap-12">
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="size-24 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 flex items-center justify-center text-4xl font-black text-slate-400 shadow-2xl skew-x-3">
                                {data.username[0].toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
                                    {data.username}
                                </h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1 text-success text-[10px] font-bold uppercase tracking-widest bg-success/10 px-2 py-0.5 rounded border border-success/20">
                                        <span className="material-symbols-outlined text-[12px]">verified</span>
                                        Verified Human
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">Member since {data.joined_at}</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Bio Card */}
                        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                <span className="material-symbols-outlined text-5xl">psychology</span>
                            </div>
                            <h4 className="text-[10px] text-primary font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-4 h-[1px] bg-primary"></span>
                                AI Behavioral Summary
                            </h4>
                            <p className="text-slate-300 leading-relaxed text-lg italic">
                                "{data.bio}"
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full md:w-80">
                        <div className="bg-surface border border-white/5 p-6 rounded-3xl">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Win Rate</p>
                            <p className="text-3xl font-black text-white">{data.stats.win_rate}%</p>
                        </div>
                        <div className="bg-surface border border-white/5 p-6 rounded-3xl">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Trades</p>
                            <p className="text-3xl font-black text-white">{data.stats.total_trades}</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl col-span-2">
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Total P&L</p>
                                <span className="material-symbols-outlined text-primary text-xl">payments</span>
                            </div>
                            <p className={`text-3xl font-black mt-1 ${data.stats.net_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                {data.stats.net_profit >= 0 ? '+' : ''}${data.stats.net_profit.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="bg-surface border border-white/5 p-8 rounded-[40px] shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">show_chart</span>
                        Verified Equity Curve
                    </h3>

                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.equity_curve}>
                                <defs>
                                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#52525b', fontSize: '10px' }}
                                />
                                <Area type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPnl)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Shared Strategies */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400">verified_user</span>
                        Public Alpha Strategies
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.strategies.map(strat => (
                            <div key={strat.id} className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl space-y-4 hover:bg-white/[0.04] transition-all">
                                <div>
                                    <h4 className="text-xl font-black text-white">{strat.name}</h4>
                                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{strat.description}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Protocol Rules</p>
                                    <div className="flex flex-wrap gap-2">
                                        {strat.checklist_items.slice(0, 3).map((item, i) => (
                                            <span key={i} className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-bold border border-indigo-500/10">
                                                {item}
                                            </span>
                                        ))}
                                        {strat.checklist_items.length > 3 && (
                                            <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold">
                                                +{strat.checklist_items.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicProfile;

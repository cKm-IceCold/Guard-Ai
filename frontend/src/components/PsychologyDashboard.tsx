import { useState, useEffect } from 'react';
import { journalService } from '../services/endpoints';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import ContributionHeatmap from './ContributionHeatmap';

interface AnalyticsData {
    equity_curve: { date: string, pnl: number }[];
    discipline_trend: { date: string, score: number }[];
}

interface AIInsights {
    impulse_alerts: string[];
    strength_matrix: string[];
    projected_yield: string;
}

const PsychologyDashboard = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [insights, setInsights] = useState<AIInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        fetchAnalytics();
        fetchAIInsights();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const analytics = await journalService.getAnalytics();
            setData(analytics);
        } catch (e) {
            console.error("Failed to fetch analytics:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchAIInsights = async () => {
        setLoadingAI(true);
        try {
            const aiData = await journalService.getInsights();
            setInsights(aiData);
        } catch (e) {
            console.error("Failed to fetch AI insights:", e);
        } finally {
            setLoadingAI(false);
        }
    };

    if (loading) return (
        <div className="h-96 flex flex-col items-center justify-center p-8 text-center bg-surface border border-[#27272a] rounded-2xl">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-500 font-mono uppercase tracking-widest">Analyzing Behavior Patterns...</p>
        </div>
    );

    if (!data || data.equity_curve.length === 0) return (
        <div className="h-96 flex flex-col items-center justify-center p-8 text-center bg-surface border border-[#27272a] rounded-2xl space-y-4">
            <span className="material-symbols-outlined text-slate-700 text-6xl">query_stats</span>
            <div>
                <p className="text-sm text-slate-500 font-mono uppercase tracking-widest">Psychology Engine Offline</p>
                <p className="text-xs text-slate-600 mt-1">Log at least 3 trades in the journal to unlock analytical insights.</p>
            </div>
            <button
                onClick={async () => {
                    await journalService.populateDemo();
                    fetchAnalytics();
                    fetchAIInsights();
                }}
                className="mt-4 px-6 py-2 bg-primary/10 border border-primary/20 text-primary rounded-full text-[10px] font-black hover:bg-primary hover:text-white transition-all"
            >
                SEED DEMO DATA
            </button>
        </div>
    );

    const latestDiscipline = data?.discipline_trend[data.discipline_trend.length - 1]?.score || 0;

    // Transform cumulative equity to daily P&L for heatmap
    // Note: This is an approximation. Ideally backend sends grouping by date.
    // For now we map strictly the trade dates.
    const heatmapData = data.equity_curve.map((d, i) => {
        const prevPnl = i > 0 ? data.equity_curve[i - 1].pnl : 0;
        return {
            date: d.date,
            value: d.pnl - prevPnl,
            count: 1
        };
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-4xl">monitoring</span>
                        PERFORMANCE HUB
                    </h2>
                    <p className="text-slate-500 font-mono text-sm mt-1 uppercase tracking-widest">Trading Performance Insights</p>
                </div>
                <div className="flex gap-2">
                    <div className={`px-4 py-2 rounded-xl border font-bold text-xs uppercase tracking-widest ${latestDiscipline >= 80 ? 'border-success text-success bg-success/5' : 'border-danger text-danger bg-danger/5'}`}>
                        {latestDiscipline >= 80 ? 'Good Discipline' : 'High Impulse Risk'}
                    </div>
                </div>
            </header>

            {/* Heatmap Section */}
            <ContributionHeatmap data={heatmapData} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Equity Curve */}
                <div className="bg-surface border border-[#27272a] p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-success">show_chart</span>
                                Profit Over Time
                            </h3>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Total Daily Progress</p>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.equity_curve}>
                                <defs>
                                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #27272a', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#52525b', fontSize: '10px' }}
                                />
                                <Area type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPnl)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Discipline Trend */}
                <div className="bg-surface border border-[#27272a] p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">psychology</span>
                                Discipline Flow
                            </h3>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Impulse Control SMA (5)</p>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data?.discipline_trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={[0, 100]}
                                    tickFormatter={(val) => `${val}%`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #27272a', borderRadius: '12px' }}
                                    itemStyle={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#52525b', fontSize: '10px' }}
                                />
                                <Line type="stepAfter" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Impulse Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#050507] border border-[#27272a] p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    {loadingAI && <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <span className="material-symbols-outlined text-yellow-500">warning</span>
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Impulse Alerts</h4>
                    </div>
                    <ul className="space-y-3">
                        {insights?.impulse_alerts.map((alert, i) => (
                            <li key={i} className="text-[10px] text-slate-400 flex items-start gap-2">
                                <span className="text-yellow-500 font-bold">•</span>
                                {alert}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-[#050507] border border-[#27272a] p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    {loadingAI && <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <span className="material-symbols-outlined text-primary">verified</span>
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Strength Matrix</h4>
                    </div>
                    <ul className="space-y-3">
                        {insights?.strength_matrix.map((strength, i) => (
                            <li key={i} className="text-[10px] text-slate-400 flex items-start gap-2">
                                <span className="text-primary font-bold">•</span>
                                {strength}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-[#050507] border border-[#27272a] p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    {loadingAI && <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-success/10 rounded-lg">
                            <span className="material-symbols-outlined text-success">auto_graph</span>
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Expected Yield</h4>
                    </div>
                    <p className="text-2xl font-mono font-black text-white">{insights?.projected_yield}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Projected Monthly Based on Discipline</p>
                </div>
            </div>
        </div>
    );
};

export default PsychologyDashboard;

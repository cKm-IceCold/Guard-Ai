import { useState, useEffect } from 'react';
import { journalService } from '../services/endpoints';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface AnalyticsData {
    equity_curve: { date: string; pnl: number }[];
    discipline_trend: { date: string; score: number }[];
}

interface AIInsights {
    impulse_alerts: string[];
    strength_matrix: string[];
    projected_yield: string;
}

// ─── Trading Calendar ──────────────────────────────────────────────────────────
interface DayData {
    date: string;       // 'YYYY-MM-DD'
    pnl: number;
    trades: number;
}

const TradingCalendar = ({ equityCurve }: { equityCurve: { date: string; pnl: number }[] }) => {
    const [viewDate, setViewDate] = useState(new Date());

    // Convert cumulative equity → daily P&L grouped by date
    const dailyMap: Record<string, DayData> = {};
    equityCurve.forEach((pt, i) => {
        const prevPnl = i > 0 ? equityCurve[i - 1].pnl : 0;
        const dayPnl = pt.pnl - prevPnl;
        if (!dailyMap[pt.date]) {
            dailyMap[pt.date] = { date: pt.date, pnl: 0, trades: 0 };
        }
        dailyMap[pt.date].pnl += dayPnl;
        dailyMap[pt.date].trades += 1;
    });

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

    // Monthly summary
    const monthDays = Object.entries(dailyMap).filter(([d]) => {
        const dd = new Date(d);
        return dd.getFullYear() === year && dd.getMonth() === month;
    });
    const totalMonthPnl = monthDays.reduce((s, [, d]) => s + d.pnl, 0);
    const winDays = monthDays.filter(([, d]) => d.pnl > 0).length;
    const lossDays = monthDays.filter(([, d]) => d.pnl < 0).length;

    const cells: (DayData | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            return dailyMap[dateStr] || { date: dateStr, pnl: 0, trades: 0 };
        }),
    ];

    return (
        <div className="bg-surface border border-border rounded-3xl p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-black text-text-main">{monthName}</h3>
                    <div className="flex gap-4 mt-1">
                        <span className="text-[10px] text-text-dim uppercase font-bold tracking-widest">
                            <span className="text-success font-black">{winDays}W</span> / <span className="text-danger font-black">{lossDays}L</span> Days
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${totalMonthPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                            {totalMonthPnl >= 0 ? '+' : ''}{totalMonthPnl.toFixed(2)} USD
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 rounded-xl border border-border hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined text-text-dim text-lg">chevron_left</span>
                    </button>
                    <button onClick={nextMonth} className="p-2 rounded-xl border border-border hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined text-text-dim text-lg">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-[9px] text-text-dim uppercase font-black tracking-widest py-1">{d}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, idx) => {
                    if (!cell) return <div key={`empty-${idx}`} />;
                    const dayNum = parseInt(cell.date.split('-')[2]);
                    const today = new Date().toISOString().split('T')[0];
                    const isToday = cell.date === today;
                    const hasActivity = cell.trades > 0;
                    const isWin = cell.pnl > 0;
                    const isLoss = cell.pnl < 0;

                    return (
                        <div
                            key={cell.date}
                            title={hasActivity ? `${cell.trades} trade${cell.trades > 1 ? 's' : ''} | ${cell.pnl >= 0 ? '+' : ''}${cell.pnl.toFixed(2)} USD` : ''}
                            className={`relative rounded-xl p-2 min-h-[60px] flex flex-col justify-between transition-all cursor-default
                                ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface' : ''}
                                ${hasActivity && isWin ? 'bg-success/10 border border-success/20' : ''}
                                ${hasActivity && isLoss ? 'bg-danger/10 border border-danger/20' : ''}
                                ${!hasActivity ? 'bg-white/[0.015] border border-transparent hover:border-border' : ''}
                            `}
                        >
                            <span className={`text-[11px] font-black ${isToday ? 'text-primary' : 'text-text-dim'}`}>{dayNum}</span>

                            {hasActivity && (
                                <div className="mt-1">
                                    <p className={`text-[10px] font-black leading-none ${isWin ? 'text-success' : 'text-danger'}`}>
                                        {isWin ? '+' : ''}{cell.pnl.toFixed(0)}
                                    </p>
                                    <p className="text-[9px] text-text-dim mt-0.5">{cell.trades}t</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-success/30 border border-success/40"></div>
                    <span className="text-[10px] text-text-dim uppercase font-bold">Profit Day</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-danger/30 border border-danger/40"></div>
                    <span className="text-[10px] text-text-dim uppercase font-bold">Loss Day</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[10px] text-text-dim">Hover a day for details</span>
                </div>
            </div>
        </div>
    );
};

// ─── Main Psychology Dashboard ─────────────────────────────────────────────────
const PsychologyDashboard = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [insights, setInsights] = useState<AIInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingAI, setLoadingAI] = useState(false);
    const [aiError, setAiError] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const analytics = await journalService.getAnalytics();
            setData(analytics);
        } catch (e) {
            console.error('Failed to fetch analytics:', e);
            // Provide empty fallback so the page still renders
            setData({ equity_curve: [], discipline_trend: [] });
        } finally {
            setLoading(false);
        }
    };

    const fetchAIInsights = async () => {
        setLoadingAI(true);
        setAiError(false);
        try {
            const aiData = await journalService.getInsights();
            setInsights(aiData);
        } catch (e) {
            console.error('Failed to fetch AI insights:', e);
            setAiError(true);
            // Safe fallback so nothing crashes
            setInsights({
                impulse_alerts: ['AI analysis unavailable. Check your API key or log more trades.'],
                strength_matrix: ['Log at least 5 trades to unlock AI pattern analysis.'],
                projected_yield: 'N/A',
            });
        } finally {
            setLoadingAI(false);
        }
    };

    if (loading) return (
        <div className="h-96 flex flex-col items-center justify-center p-8 text-center bg-surface border border-border rounded-2xl">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-text-dim font-mono uppercase tracking-widest">Loading performance data...</p>
        </div>
    );

    const hasData = data && data.equity_curve.length > 0;
    const latestDiscipline = data?.discipline_trend[data.discipline_trend.length - 1]?.score || 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* ── Header ──────────────────────────────────── */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-4xl">monitoring</span>
                        PERFORMANCE HUB
                    </h2>
                    <p className="text-text-dim font-mono text-sm mt-1 uppercase tracking-widest">Trading Psychology & Analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    {hasData && (
                        <div className={`px-4 py-2 rounded-xl border font-bold text-xs uppercase tracking-widest ${latestDiscipline >= 80 ? 'border-success text-success bg-success/5' : 'border-danger text-danger bg-danger/5'}`}>
                            {latestDiscipline >= 80 ? '✓ Good Discipline' : '⚠ High Impulse Risk'}
                        </div>
                    )}
                </div>
            </header>

            {/* ── No Data State ────────────────────────────── */}
            {!hasData && (
                <div className="glass-card rounded-3xl p-16 text-center space-y-4">
                    <span className="material-symbols-outlined text-slate-700 text-6xl block">query_stats</span>
                    <div>
                        <p className="text-sm text-text-dim font-mono uppercase tracking-widest">Psychology Engine Offline</p>
                        <p className="text-xs text-text-dim mt-1">Log at least 3 trades in the journal to unlock analytical insights.</p>
                    </div>
                    <button
                        onClick={async () => {
                            await journalService.populateDemo();
                            fetchAnalytics();
                        }}
                        className="mt-4 px-6 py-2 bg-primary/10 border border-primary/20 text-primary rounded-full text-[10px] font-black hover:bg-primary hover:text-white transition-all"
                    >
                        SEED DEMO DATA
                    </button>
                </div>
            )}

            {hasData && (
                <>
                    {/* ── Trading Calendar ─────────────────────── */}
                    <TradingCalendar equityCurve={data!.equity_curve} />

                    {/* ── Charts ──────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Equity Curve */}
                        <div className="bg-surface border border-border p-8 rounded-3xl shadow-2xl">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                                    <span className="material-symbols-outlined text-success">show_chart</span>
                                    Profit Over Time
                                </h3>
                                <p className="text-[10px] text-text-dim uppercase font-black tracking-widest mt-1">Cumulative P&L Curve</p>
                            </div>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.equity_curve}>
                                        <defs>
                                            <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                        <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                                        <Area type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPnl)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Discipline Trend */}
                        <div className="bg-surface border border-border p-8 rounded-3xl shadow-2xl">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">psychology</span>
                                    Discipline Flow
                                </h3>
                                <p className="text-[10px] text-text-dim uppercase font-black tracking-widest mt-1">Impulse Control SMA-5</p>
                            </div>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data?.discipline_trend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                        <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }} itemStyle={{ color: '#8b5cf6', fontSize: '12px', fontWeight: 'bold' }} />
                                        <Line type="stepAfter" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* ── AI Insights ──────────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-text-dim uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                                AI Behavioral Analysis
                            </h3>
                            {!insights && !loadingAI && (
                                <button
                                    onClick={fetchAIInsights}
                                    className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-black hover:bg-primary hover:text-white transition-all"
                                >
                                    Run Analysis
                                </button>
                            )}
                            {loadingAI && (
                                <div className="flex items-center gap-2 text-text-dim text-[10px] uppercase font-black">
                                    <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    Analyzing...
                                </div>
                            )}
                        </div>

                        {!insights && !loadingAI && (
                            <div className="glass-card rounded-2xl p-8 text-center border border-dashed border-border">
                                <span className="material-symbols-outlined text-text-dim text-4xl block mb-2">auto_awesome</span>
                                <p className="text-text-dim text-sm">Click "Run Analysis" to get AI-powered insights on your trading psychology and patterns.</p>
                            </div>
                        )}

                        {insights && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { title: 'Impulse Alerts', icon: 'warning', color: 'text-yellow-500', bg: 'bg-yellow-500/10', items: insights.impulse_alerts || [] },
                                    { title: 'Strength Matrix', icon: 'verified', color: 'text-primary', bg: 'bg-primary/10', items: insights.strength_matrix || [] },
                                ].map(section => (
                                    <div key={section.title} className="bg-surface border border-border p-6 rounded-3xl shadow-xl relative overflow-hidden">
                                        {loadingAI && <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 ${section.bg} rounded-lg`}>
                                                <span className={`material-symbols-outlined ${section.color}`}>{section.icon}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-text-main uppercase tracking-widest">{section.title}</h4>
                                        </div>
                                        <ul className="space-y-3">
                                            {section.items.map((item, i) => (
                                                <li key={i} className="text-[11px] text-text-dim flex items-start gap-2 leading-relaxed">
                                                    <span className={`${section.color} font-bold mt-0.5 flex-shrink-0`}>•</span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}

                                <div className="bg-surface border border-border p-6 rounded-3xl shadow-xl relative overflow-hidden">
                                    {loadingAI && <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-success/10 rounded-lg">
                                            <span className="material-symbols-outlined text-success">auto_graph</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-text-main uppercase tracking-widest">Expected Yield</h4>
                                    </div>
                                    <p className="text-3xl font-mono font-black text-text-main">{insights.projected_yield || 'N/A'}</p>
                                    <p className="text-[9px] text-text-dim uppercase tracking-widest mt-2">Projected monthly based on discipline</p>
                                    <button onClick={fetchAIInsights} className="mt-4 text-[10px] text-primary font-black uppercase tracking-widest hover:underline">
                                        Refresh Analysis →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default PsychologyDashboard;

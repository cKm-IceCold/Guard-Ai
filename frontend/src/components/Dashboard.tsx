import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { journalService, riskService } from '../services/endpoints';

interface Ticker {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
}

const Dashboard = () => {
    const { user } = useAuth();
    const [prices, setPrices] = useState<Ticker[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [riskProfile, setRiskProfile] = useState<any>(null);

    // Fetch live prices from Binance (Public API)
    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
                const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
                const data = await response.json();
                const filtered = data.filter((item: any) => symbols.includes(item.symbol));
                setPrices(filtered);
            } catch (e) {
                console.error("Price fetch error:", e);
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 5000); // 5s refresh
        return () => clearInterval(interval);
    }, []);

    // Fetch personalized stats and risk profile
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, riskData] = await Promise.all([
                    journalService.getStats(),
                    riskService.getProfile()
                ]);
                setStats(statsData);
                setRiskProfile(riskData);
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-4xl">terminal</span>
                        MARKET COMMAND
                    </h2>
                    <p className="text-slate-500 font-mono text-sm mt-1 uppercase tracking-widest">
                        Welcome back, <span className="text-primary font-bold">{user?.email || 'Operator'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono bg-[#0a0a0c] border border-[#27272a] px-4 py-2 rounded-full shadow-lg shadow-black/50">
                    <div className="size-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-slate-400">DATA FEED ACTIVE</span>
                </div>
            </header>

            {/* Live Ticker Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {prices.length > 0 ? (
                    prices.map(m => (
                        <div key={m.symbol} className="p-5 bg-surface border border-[#27272a] rounded-2xl shadow-xl hover:border-primary/50 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <span className="material-symbols-outlined text-4xl transform rotate-45">bolt</span>
                            </div>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-black text-white group-hover:text-primary transition-colors tracking-tighter uppercase">{m.symbol.replace('USDT', '')}/USDT</h3>
                                    <p className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${parseFloat(m.priceChangePercent) >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                        {parseFloat(m.priceChangePercent) >= 0 ? '+' : ''}{m.priceChangePercent}%
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-slate-700 text-lg">trending_up</span>
                            </div>
                            <p className="font-mono text-xl text-slate-100 font-bold self-end leading-none">
                                ${parseFloat(m.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full h-24 flex items-center justify-center text-slate-700 font-mono animate-pulse uppercase text-xs tracking-widest">
                        Initializing Encrypted Feeds...
                    </div>
                )}
            </div>

            {/* Personalized Stats Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#050507] border border-[#27272a] rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 opacity-[0.02] -translate-y-1/4 translate-x-1/4">
                        <span className="material-symbols-outlined text-[300px]">shield</span>
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                PERFORMANCE LEDGER
                            </h3>
                            <div className="text-right">
                                <div className={`text-[10px] mb-1 font-bold ${riskProfile?.is_locked ? 'text-danger' : 'text-success'}`}>
                                    {riskProfile?.is_locked ? 'TERMINAL LOCKED' : 'TERMINAL ACTIVE'}
                                </div>
                                <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${riskProfile?.is_locked ? 'bg-danger w-full' : 'bg-success w-1/3'}`}></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Win Rate</p>
                                <p className="text-4xl font-mono font-black text-white">{stats?.win_rate || '0.0'}%</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Discipline</p>
                                <p className="text-4xl font-mono font-black text-primary">{stats?.discipline_rate || '0.0'}%</p>
                            </div>
                            <div className="hidden md:block">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Total Yield</p>
                                <p className={`text-4xl font-mono font-black ${parseFloat(stats?.total_pnl || '0') >= 0 ? 'text-success' : 'text-danger'}`}>
                                    ${stats?.total_pnl || '0.00'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-indigo-500"
                                        style={{ width: `${stats?.discipline_rate || 0}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 uppercase">System Integrity</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Active Rules (Dynamic from Risk Profile) */}
                <div className="bg-surface border border-[#27272a] rounded-3xl p-6 flex flex-col shadow-2xl">
                    <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-500 text-sm">security</span>
                        Hard Rules Active
                    </h3>
                    <div className="space-y-4 flex-1">
                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Max Daily Loss</p>
                            <p className="text-xl font-mono font-bold text-danger">${riskProfile?.max_daily_loss || '0.00'}</p>
                        </div>
                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Max Drawdown</p>
                            <p className="text-xl font-mono font-bold text-danger">${riskProfile?.max_drawdown || '0.00'}</p>
                        </div>
                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Daily Trade Cap</p>
                            <p className="text-xl font-mono font-bold text-white">{riskProfile?.max_trades_per_day || '0'} Trades</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-600 italic mt-6 text-center px-4 leading-relaxed">
                        Limits are computed server-side. Violations trigger terminal lockdown.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

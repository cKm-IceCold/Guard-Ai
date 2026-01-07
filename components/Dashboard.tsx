
import React from 'react';
import { MarketPair, RiskProfile, TradeSignal } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  pairs: MarketPair[];
  riskProfile: RiskProfile;
  signals: TradeSignal[];
}

const DATA = [
  { time: '00:00', price: 62000 },
  { time: '04:00', price: 61500 },
  { time: '08:00', price: 63000 },
  { time: '12:00', price: 64500 },
  { time: '16:00', price: 64230 },
  { time: '20:00', price: 65000 },
];

const Dashboard: React.FC<DashboardProps> = ({ pairs, riskProfile, signals }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#14141a] border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Total Balance</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">$124,500.82</span>
            <span className="text-green-500 text-sm font-medium pb-1">+1.2%</span>
          </div>
          <div className="mt-4 h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DATA}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="price" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#14141a] border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Discipline Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Daily Trade Limit</span>
              <span className="text-sm font-mono">{riskProfile.tradesToday} / {riskProfile.maxTradesPerDay}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${riskProfile.tradesToday >= riskProfile.maxTradesPerDay ? 'bg-red-500' : 'bg-indigo-500'}`}
                style={{ width: `${(riskProfile.tradesToday / riskProfile.maxTradesPerDay) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Rule Adherence</span>
              <span className="text-sm font-bold text-green-400">98.5%</span>
            </div>
          </div>
        </div>

        <div className="bg-[#14141a] border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Active Strategy</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-600/20 rounded-xl">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-white">Trend Following AI</p>
              <p className="text-xs text-slate-500">Executing on 5min intervals</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] rounded border border-green-500/20">SCALPING</span>
            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] rounded border border-blue-500/20">LOW RISK</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#14141a] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold">Hot Market Pairs</h3>
            <button className="text-indigo-400 text-xs font-semibold hover:underline">View All</button>
          </div>
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Symbol</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Volatility</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pairs.slice(0, 4).map((pair) => (
                <tr key={pair.symbol} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-sm">{pair.symbol}</td>
                  <td className="px-6 py-4 font-mono text-sm">${pair.price.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: `${pair.volatility}%` }}></div>
                      </div>
                      <span className="text-xs text-slate-400">{pair.volatility}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${pair.trend === 'UP' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {pair.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#14141a] border border-slate-800 rounded-2xl p-6">
          <h3 className="font-bold mb-6">Recent AI Trade Signals</h3>
          {signals.length > 0 ? (
            <div className="space-y-4">
              {signals.map((sig, idx) => (
                <div key={idx} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{sig.pair}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${sig.action === 'BUY' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {sig.action}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">Strength: {sig.strength}%</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{sig.reasoning}</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                    <div className="bg-slate-800 p-2 rounded">ENT: {sig.entry}</div>
                    <div className="bg-green-900/20 text-green-400 p-2 rounded">TP: {sig.tp}</div>
                    <div className="bg-red-900/20 text-red-400 p-2 rounded">SL: {sig.sl}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
              <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Run scanner to generate signals</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

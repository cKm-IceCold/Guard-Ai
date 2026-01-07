
import React from 'react';
import { RiskProfile } from '../types';

interface RiskGuardianProps {
  profile: RiskProfile;
  onUpdate: (updates: Partial<RiskProfile>) => void;
}

const RiskGuardian: React.FC<RiskGuardianProps> = ({ profile, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#14141a] border border-slate-800 rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-rose-600/20 rounded-xl">
            <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Discipline Guardian</h2>
            <p className="text-slate-400">Set hard limits that lock the app to prevent impulsive trading.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase">Max Daily Loss</h4>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">$</span>
              <input 
                type="number" 
                value={profile.maxDailyLoss} 
                onChange={(e) => onUpdate({ maxDailyLoss: Number(e.target.value) })}
                className="bg-transparent border-none p-0 focus:ring-0 text-3xl font-mono text-white w-full" 
              />
            </div>
            <p className="text-xs text-slate-500">The software will lock if your total PnL for the day hits this negative value.</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase">Max Daily Trades</h4>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={profile.maxTradesPerDay} 
                onChange={(e) => onUpdate({ maxTradesPerDay: Number(e.target.value) })}
                className="bg-transparent border-none p-0 focus:ring-0 text-3xl font-mono text-white w-full" 
              />
              <span className="text-lg text-slate-500">Trades</span>
            </div>
            <p className="text-xs text-slate-500">Prevents over-trading by capping the total number of entries per 24h.</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase">Equity Lockdown (%)</h4>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                defaultValue="5"
                className="bg-transparent border-none p-0 focus:ring-0 text-3xl font-mono text-white w-full" 
              />
              <span className="text-lg text-slate-500">%</span>
            </div>
            <p className="text-xs text-slate-500">Lock system if total account equity drops by this percentage in a single day.</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-slate-900/80 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold">Hard Lock Mode</h4>
            <span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full text-xs font-bold uppercase">Enhanced Protection</span>
          </div>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            When Hard Lock is enabled, the discipline guardian uses biometric-level commitment. You will be unable to modify these settings or trade until the next daily reset (00:00 UTC) if a breach occurs.
          </p>
          <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl font-bold border border-slate-700">
            ENABLE HARD LOCK PROTECTION
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiskGuardian;

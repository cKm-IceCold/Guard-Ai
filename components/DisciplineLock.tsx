
import React from 'react';

interface DisciplineLockProps {
  reason?: string;
  onUnlock: () => void;
}

const DisciplineLock: React.FC<DisciplineLockProps> = ({ reason, onUnlock }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0c]/95 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-300">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-rose-500 blur-3xl opacity-20"></div>
          <div className="relative p-6 bg-rose-500/10 border border-rose-500/50 rounded-3xl inline-flex items-center justify-center">
            <svg className="w-16 h-16 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter text-white">DISCIPLINE LOCK</h1>
          <p className="text-slate-400 text-lg">Your Guard AI Guardian has paused all trading activity.</p>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-left">
          <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">BREACH DETECTED</p>
          <p className="text-slate-200 font-mono text-sm leading-relaxed">
            {reason || "Protocol Violation: Emotional trading or limit breach detected. Trading system is now in hibernation mode to protect your capital."}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-500 italic">"The market is a device for transferring money from the impatient to the patient."</p>
          <div className="flex gap-4">
            <button 
              onClick={onUnlock}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all border border-slate-700"
            >
              EMERGENCY RESET
            </button>
            <button className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-500/20">
              LOGOUT & COOL DOWN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisciplineLock;

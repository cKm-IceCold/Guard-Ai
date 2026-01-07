
import React, { useState, useEffect, useCallback } from 'react';
import { AssetType, MarketPair, RiskProfile, TradeSignal, ChatMessage } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MarketScanner from './components/MarketScanner';
import StrategyBuilder from './components/StrategyBuilder';
import RiskGuardian from './components/RiskGuardian';
import Assistant from './components/Assistant';
import DisciplineLock from './components/DisciplineLock';

const MOCK_PAIRS: MarketPair[] = [
  { symbol: 'BTC/USDT', price: 64230.50, change24h: 2.4, volatility: 78, trend: 'UP', type: AssetType.CRYPTO },
  { symbol: 'ETH/USDT', price: 3450.12, change24h: -1.2, volatility: 65, trend: 'DOWN', type: AssetType.CRYPTO },
  { symbol: 'EUR/USD', price: 1.0854, change24h: 0.15, volatility: 12, trend: 'SIDEWAYS', type: AssetType.FOREX },
  { symbol: 'GBP/JPY', price: 191.24, change24h: 0.82, volatility: 45, trend: 'UP', type: AssetType.FOREX },
  { symbol: 'SOL/USDT', price: 145.88, change24h: 5.6, volatility: 92, trend: 'UP', type: AssetType.CRYPTO },
  { symbol: 'XAU/USD', price: 2345.10, change24h: -0.4, volatility: 35, trend: 'DOWN', type: AssetType.FOREX },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scanner' | 'strategy' | 'risk' | 'chat'>('dashboard');
  const [pairs, setPairs] = useState<MarketPair[]>(MOCK_PAIRS);
  const [riskProfile, setRiskProfile] = useState<RiskProfile>({
    maxDailyLoss: 500,
    maxDrawdown: 1500,
    maxTradesPerDay: 5,
    currentDailyLoss: 0,
    tradesToday: 0,
    isLocked: false,
  });

  const [signals, setSignals] = useState<TradeSignal[]>([]);

  // Check for discipline breaches
  useEffect(() => {
    if (riskProfile.currentDailyLoss >= riskProfile.maxDailyLoss) {
      setRiskProfile(prev => ({ 
        ...prev, 
        isLocked: true, 
        lockReason: `Maximum Daily Loss Limit ($${riskProfile.maxDailyLoss}) reached.` 
      }));
    }
    if (riskProfile.tradesToday >= riskProfile.maxTradesPerDay) {
      setRiskProfile(prev => ({ 
        ...prev, 
        isLocked: true, 
        lockReason: `Maximum Daily Trade Limit (${riskProfile.maxTradesPerDay}) reached.` 
      }));
    }
  }, [riskProfile.currentDailyLoss, riskProfile.tradesToday, riskProfile.maxDailyLoss, riskProfile.maxTradesPerDay]);

  const handleUpdateRisk = (updates: Partial<RiskProfile>) => {
    setRiskProfile(prev => ({ ...prev, ...updates }));
  };

  const unlockSystem = () => {
    setRiskProfile(prev => ({ ...prev, isLocked: false, currentDailyLoss: 0, tradesToday: 0, lockReason: undefined }));
  };

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden">
      {riskProfile.isLocked && <DisciplineLock reason={riskProfile.lockReason} onUnlock={unlockSystem} />}
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Guard AI</h1>
            <p className="text-slate-500 text-sm">Real-time market intelligence & discipline guardian</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-[#1a1a1e] border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-3">
              <span className="text-xs uppercase text-slate-500 font-semibold">Today's Risk</span>
              <div className="flex gap-2">
                <span className={`text-sm font-mono ${riskProfile.currentDailyLoss > riskProfile.maxDailyLoss * 0.8 ? 'text-red-400' : 'text-green-400'}`}>
                  -${riskProfile.currentDailyLoss}
                </span>
                <span className="text-slate-700">/</span>
                <span className="text-sm font-mono text-slate-400">${riskProfile.maxDailyLoss}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard pairs={pairs} riskProfile={riskProfile} signals={signals} />}
          {activeTab === 'scanner' && <MarketScanner pairs={pairs} setSignals={setSignals} />}
          {activeTab === 'strategy' && <StrategyBuilder />}
          {activeTab === 'risk' && <RiskGuardian profile={riskProfile} onUpdate={handleUpdateRisk} />}
          {activeTab === 'chat' && <Assistant />}
        </div>
      </main>
    </div>
  );
};

export default App;

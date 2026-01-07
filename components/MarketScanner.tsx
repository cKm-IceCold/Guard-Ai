
import React, { useState } from 'react';
import { MarketPair, TradeSignal } from '../types';
import { analyzeMarketVolatility, generateTradeSignals } from '../services/geminiService';

interface MarketScannerProps {
  pairs: MarketPair[];
  setSignals: (signals: TradeSignal[]) => void;
}

const MarketScanner: React.FC<MarketScannerProps> = ({ pairs, setSignals }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');

  const runScanner = async () => {
    setIsScanning(true);
    try {
      const summary = await analyzeMarketVolatility(pairs);
      setAnalysis(summary);

      // Pick top 2 volatile pairs for signal generation
      const topPairs = [...pairs].sort((a, b) => b.volatility - a.volatility).slice(0, 2);
      const allSignals: TradeSignal[] = [];
      
      for (const pair of topPairs) {
        const sigs = await generateTradeSignals(pair.symbol, pair.price);
        allSignals.push(...sigs);
      }
      
      setSignals(allSignals);
    } catch (error) {
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#14141a] border border-slate-800 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Deep Market Scanner</h2>
        <p className="text-slate-400 mb-6 max-w-lg mx-auto">
          Our Gemini-powered engine scans across Forex and Crypto pairs to identify abnormal volatility and hidden institutional liquidity zones.
        </p>
        <button
          onClick={runScanner}
          disabled={isScanning}
          className={`px-8 py-4 bg-indigo-600 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 ${isScanning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-500'}`}
        >
          {isScanning ? (
            <span className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              AI PROCESSING...
            </span>
          ) : 'START SCANNING'}
        </button>
      </div>

      {analysis && (
        <div className="bg-[#14141a] border border-slate-800 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-bold text-lg">AI Market Insights</h3>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            {analysis.split('\n').map((para, i) => (
              <p key={i} className="mb-4 leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pairs.map((pair) => (
          <div key={pair.symbol} className="bg-[#14141a] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-lg">{pair.symbol}</h4>
                <p className="text-xs text-slate-500 uppercase">{pair.type}</p>
              </div>
              <div className={`text-right ${pair.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                <div className="font-mono text-sm">${pair.price.toLocaleString()}</div>
                <div className="text-xs font-bold">{pair.change24h > 0 ? '+' : ''}{pair.change24h}%</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                <span>VOLATILITY SCORE</span>
                <span>{pair.volatility}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${pair.volatility > 70 ? 'bg-orange-500' : 'bg-indigo-500'}`} 
                  style={{ width: `${pair.volatility}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketScanner;

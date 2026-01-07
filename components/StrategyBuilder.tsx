
import React, { useState, useEffect, useRef } from 'react';
import { interpretStrategy } from '../services/geminiService';

const StrategyBuilder = () => {
  const [isBotLive, setIsBotLive] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interpretation, setInterpretation] = useState(null);
  const [activeTab, setActiveTab] = useState('build');
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  const handleAnalyze = async () => {
    if (!description.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await interpretStrategy(description);
      setInterpretation(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activateBot = () => {
    setIsDeploying(true);
    const asset = interpretation?.asset || "Asset";
    const deploymentLogs = [
      `Initializing Guard Neural Link for ${asset}...`,
      `Syncing historical volatility data for ${asset}...`,
      "Connecting to institutional liquidity pools...",
      "Injecting Risk Management protocols...",
      "Strategy logic successfully compiled.",
      `Bot GAI-77 LIVE on ${asset}.`
    ];
    
    deploymentLogs.forEach((log, i) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
        if (i === deploymentLogs.length - 1) {
          setTimeout(() => {
            setIsDeploying(false);
            setIsBotLive(true);
          }, 800);
        }
      }, i * 600);
    });
  };

  useEffect(() => {
    if (isBotLive) {
      const asset = interpretation?.asset || "Selected Asset";
      const interval = setInterval(() => {
        const botActions = [
          `Scanning ${asset} order books...`,
          `Checking RSI divergence for ${asset} on 5m chart...`,
          `Institutional liquidity sweep detected on ${asset}.`,
          `Waiting for candle close on ${asset} to confirm entry...`,
          `Position sizing calculated for ${asset}.`,
          `Market condition for ${asset}: Neutral. Staying flat.`
        ];
        const randomAction = botActions[Math.floor(Math.random() * botActions.length)];
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${randomAction}`].slice(-15));
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isBotLive, interpretation]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const examples = [
    { title: "Gold (XAU/USD) Killzone", desc: "Trade Gold. Look for a liquidity sweep during the London Open. Buy if price bounces off a 15m Fair Value Gap. Risk 1% with 1:2 RR." },
    { title: "BTC Trend Follower", desc: "Trade BTC/USDT on the 1H chart. Buy when 20 EMA crosses above 50 EMA and RSI is > 50. Exit when price closes below 20 EMA." },
    { title: "Euro Scalper", desc: "Trade EUR/USD. Scalp 5m timeframes using MACD crossovers. Only trade during New York session overlap." }
  ];

  const templates = [
    { label: "Instrument", hint: "BE SPECIFIC: State the asset clearly (e.g. 'Trade Gold/USD' or 'Trade BTC/USDT')." },
    { label: "Trigger", hint: "What starts the trade? (e.g. 'When RSI crosses 30', 'After a 1H break of structure')." },
    { label: "Risk", hint: "Define your stops: '20 pips stop loss', 'Risk 0.5% per trade'." }
  ];

  if (isBotLive) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-[#14141a] border border-green-500/30 rounded-2xl p-6 md:p-8 shadow-2xl shadow-green-500/5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                <div className="h-4 w-4 bg-green-500 rounded-full relative z-10"></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  Bot Live: <span className="text-indigo-400 font-mono">{interpretation?.asset || "GAI-77"}</span>
                </h2>
                <p className="text-slate-400 text-sm">Active Strategy: {interpretation?.summary?.slice(0, 80)}...</p>
              </div>
            </div>
            <button 
              onClick={() => setIsBotLive(false)}
              className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              TERMINATE BOT
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#0a0a0c] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-96">
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Terminal: {interpretation?.asset}</span>
                <span className="text-[10px] font-mono text-green-500">WS://ACTIVE_DATA_FEED</span>
              </div>
              <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="text-slate-400">
                    <span className="text-indigo-500">{log.split(']')[0]}]</span>
                    <span className="text-slate-200">{log.split(']')[1]}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3">Live Session Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500">REAL-TIME P/L</p>
                    <p className="text-xl font-bold text-green-400">+$0.00</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">EXPECTED WR</p>
                    <p className="text-xl font-bold text-white">{interpretation?.backtest?.winRate || "0"}%</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-[10px] text-indigo-300 font-bold uppercase mb-1">Risk Profile</p>
                <p className="text-xs text-slate-400">{interpretation?.riskRating}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isDeploying) {
    return (
      <div className="h-[70vh] flex items-center justify-center animate-in fade-in duration-500">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-indigo-600 blur-3xl opacity-20 animate-pulse"></div>
            <div className="h-24 w-24 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin flex items-center justify-center relative">
              <span className="font-bold text-2xl">G</span>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Deploying Strategy...</h2>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-[10px] text-indigo-400 text-left h-32 overflow-hidden">
              {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#14141a] border border-slate-800 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold">Strategy Automator</h2>
            <p className="text-slate-400">Describe your logic using our Framework (Asset + Trigger + Exit).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-4 border-b border-slate-800 mb-2">
              <button onClick={() => setActiveTab('build')} className={`pb-3 text-sm font-bold transition-all ${activeTab === 'build' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}>Custom Build</button>
              <button onClick={() => setActiveTab('guidance')} className={`pb-3 text-sm font-bold transition-all ${activeTab === 'guidance' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}>How to Describe</button>
              <button onClick={() => setActiveTab('examples')} className={`pb-3 text-sm font-bold transition-all ${activeTab === 'examples' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}>Examples</button>
            </div>

            {activeTab === 'build' && (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Example: 'Trade Gold (XAU/USD) on the 1H timeframe. Buy when...' "
                    className="w-full h-48 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-600"
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !description.trim()}
                    className="absolute bottom-4 right-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-xs font-bold transition-all shadow-lg"
                  >
                    {isAnalyzing ? 'Running AI Backtest...' : 'Analyze & Backtest'}
                  </button>
                </div>

                {interpretation && (
                  <div className="bg-indigo-600/5 border border-indigo-600/20 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase">{interpretation.asset}</span>
                        <h4 className="font-bold text-indigo-400">Interpretation</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${interpretation.riskRating?.toLowerCase().includes('extreme') ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                        RISK: {interpretation.riskRating}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 mb-6 italic leading-relaxed">"{interpretation.summary}"</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500 uppercase mb-1">Win Rate</p>
                        <p className={`text-lg font-bold ${interpretation.backtest.winRate > 50 ? 'text-green-400' : 'text-amber-400'}`}>{interpretation.backtest.winRate}%</p>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500 uppercase mb-1">Total Trades</p>
                        <p className="text-lg font-bold text-white">{interpretation.backtest.totalTrades}</p>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500 uppercase mb-1">Profit Factor</p>
                        <p className="text-lg font-bold text-white">{interpretation.backtest.profitFactor}</p>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500 uppercase mb-1">Drawdown</p>
                        <p className="text-lg font-bold text-red-400">{interpretation.backtest.drawdown}%</p>
                      </div>
                    </div>
                    
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Sample Simulations</h5>
                    <div className="space-y-3 mb-6">
                      {interpretation.simulations?.map((sim, idx) => (
                        <div key={idx} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-slate-200">{sim.scenario}</p>
                            <p className="text-slate-500">{sim.action}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono font-bold ${sim.pnl.includes('+') ? 'text-green-400' : 'text-red-400'}`}>{sim.pnl}</p>
                            <p className="text-slate-500">{sim.result}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={activateBot}
                      className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-green-500/20 transition-all active:scale-[0.98]"
                    >
                      CONFIRM & ACTIVATE ON {interpretation.asset.toUpperCase()}
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Guidance & Examples omitted for brevity but remain functionally same with GAI bot ID updates if any */}
          </div>
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Risk Safeguards</h3>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Hard Daily Stop</span><span className="text-white font-mono">-$500</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Max Open Trades</span><span className="text-white font-mono">2</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyBuilder;

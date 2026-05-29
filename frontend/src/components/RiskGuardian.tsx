import { useState, useEffect } from 'react';
import { riskService, journalService } from '../services/endpoints';

const LockCountdown = ({ lockedAt, onComplete }: { lockedAt: string, onComplete: () => void }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const calculateTime = () => {
            const lockTime = new Date(lockedAt).getTime();
            const unlockTime = lockTime + (12 * 60 * 60 * 1000); // +12 hours
            const now = new Date().getTime();
            const diff = unlockTime - now;

            if (diff <= 0) {
                onComplete();
                return '00:00:00';
            }

            const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');

            return `${h}:${m}:${s}`;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTime());
        }, 1000);

        setTimeLeft(calculateTime());
        return () => clearInterval(timer);
    }, [lockedAt, onComplete]);

    return (
        <div className="flex flex-col items-end">
            <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest mb-1">Unlocks In</p>
            <p className="text-2xl font-mono font-black text-text-main group-hover:text-danger transition-colors">{timeLeft}</p>
        </div>
    );
};

const RiskGuardian = () => {
    // RISK PROFILE: Tracks current daily loss, trade count, and lock status.
    const [profile, setProfile] = useState<any>(null);
    // Performance stats from the Journal (Win Rate, Discipline).
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // SETTINGS STATE: For adjusting risk limits.
    const [showSettings, setShowSettings] = useState(false);
    const [newMaxLoss, setNewMaxLoss] = useState('');
    const [newMaxTrades, setNewMaxTrades] = useState('');
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState('');

    const downloadMQL5File = () => {
        const mql5Code = `//+------------------------------------------------------------------+
//|                                              GuardAI_Bridge.mq5  |
//|                                  Copyright 2026, Guard AI        |
//|                                             https://guard-ai.io  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Guard AI"
#property link      "https://guard-ai.io"
#property version   "1.00"
#property strict

// Input Parameters
input string   BackendURL = "http://127.0.0.1:8000/api/risk/mt5-sync/";
input string   AuthToken  = "your_jwt_token_here";
input int      SyncIntervalSeconds = 5;

// Global Variables
datetime lastSyncTime = 0;
bool isLocked = false;
string lockReason = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("--------------------------------------------------");
   Print("Guard AI Active Discipline Agent Initialized.");
   Print("Connection Endpoint: ", BackendURL);
   Print("--------------------------------------------------");
   
   EventSetTimer(SyncIntervalSeconds);
   SyncWithBackend();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("Guard AI Discipline Agent Stopped.");
}

//+------------------------------------------------------------------+
//| Timer event function for background polling                       |
//+------------------------------------------------------------------+
void OnTimer()
{
   SyncWithBackend();
   if(isLocked) {
      EnforceTerminalLock();
   }
}

//+------------------------------------------------------------------+
//| Monitors live order ticks to prevent manual bypass while locked  |
//+------------------------------------------------------------------+
void OnTrade()
{
   if(isLocked) {
      Print("[Guard AI] CRITICAL: Order activity detected while locked! Liquidating...");
      EnforceTerminalLock();
   }
}

//+------------------------------------------------------------------+
//| Sends account statistics to Django and updates lock states       |
//+------------------------------------------------------------------+
void SyncWithBackend()
{
   char postData[];
   char result[];
   string resultHeaders;
   
   string positionsJson = "";
   int totalPositions = PositionsTotal();
   int activeCount = 0;
   
   for(int i = 0; i < totalPositions; i++)
   {
      string symbol = PositionGetSymbol(i);
      ulong ticket = PositionGetInteger(POSITION_TICKET);
      
      if(ticket > 0 && symbol != "")
      {
         double pnl = PositionGetDouble(POSITION_PROFIT);
         long type = PositionGetInteger(POSITION_TYPE); // 0 = Buy, 1 = Sell
         
         if(activeCount > 0) positionsJson += ",";
         positionsJson += StringFormat("{\\"ticket\\": %d, \\"symbol\\": \\"%s\\", \\"pnl\\": %.2f, \\"type\\": %d}", ticket, symbol, pnl, type);
         activeCount++;
      }
   }
   
   string jsonPayload = StringFormat(
      "{\\"balance\\": %.2f, \\"equity\\": %.2f, \\"positions\\": [%s]}",
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      positionsJson
   );
   
   StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   string headers = "Content-Type: application/json\\r\\n";
   headers += "Authorization: Token " + AuthToken + "\\r\\n";
   
   int timeout = 4000;
   ResetLastError();
   int responseCode = WebRequest(
      "POST",
      BackendURL,
      headers,
      timeout,
      postData,
      result,
      resultHeaders
   );
   
   if(responseCode == 200)
   {
      string responseText = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      if(StringFind(responseText, "\\"is_locked\\":true") != -1)
      {
         isLocked = true;
         int reasonIndex = StringFind(responseText, "\\"lock_reason\\":\\"");
         if(reasonIndex != -1)
         {
            int start = reasonIndex + 15;
            int end = StringFind(responseText, "\\"", start);
            if(end != -1)
            {
               lockReason = StringSubstr(responseText, start, end - start);
            }
         }
         else
         {
            lockReason = "Drawdown or Trade Limit Exceeded.";
         }
      }
      else
      {
         isLocked = false;
         lockReason = "";
      }
   }
   else
   {
      Print("[Guard AI] Sync Connection Failure. Code: ", responseCode);
   }
}

//+------------------------------------------------------------------+
//| Hard Enforcement: Closes all active trades and cancels pending  |
//+------------------------------------------------------------------+
void EnforceTerminalLock()
{
   MqlTradeRequest request;
   MqlTradeResult  tradeResult;
   
   int totalPositions = PositionsTotal();
   for(int i = totalPositions - 1; i >= 0; i--)
   {
      string symbol = PositionGetSymbol(i);
      ulong ticket = PositionGetInteger(POSITION_TICKET);
      
      if(ticket > 0 && symbol != "")
      {
         ZeroMemory(request);
         ZeroMemory(tradeResult);
         
         double volume = PositionGetDouble(POSITION_VOLUME);
         long type = PositionGetInteger(POSITION_TYPE);
         
         request.action = TRADE_ACTION_DEAL;
         request.position = ticket;
         request.symbol = symbol;
         request.volume = volume;
         request.magic = 99999;
         request.deviation = 10;
         
         if(type == POSITION_TYPE_BUY)
         {
            request.type = ORDER_TYPE_SELL;
            request.price = SymbolInfoDouble(symbol, SYMBOL_BID);
         }
         else
         {
            request.type = ORDER_TYPE_BUY;
            request.price = SymbolInfoDouble(symbol, SYMBOL_ASK);
         }
         
         ResetLastError();
         OrderSend(request, tradeResult);
      }
   }
   
   int totalOrders = OrdersTotal();
   for(int i = totalOrders - 1; i >= 0; i--)
   {
      ulong ticket = OrderGetTicket(i);
      if(ticket > 0)
      {
         ZeroMemory(request);
         ZeroMemory(tradeResult);
         
         request.action = TRADE_ACTION_REMOVE;
         request.order = ticket;
         
         ResetLastError();
         OrderSend(request, tradeResult);
      }
   }
   
   Comment(StringFormat(
      "=========================================\\n"+
      "   GUARD AI: CAPITAL PROTECTION BLOCK   \\n"+
      "=========================================\\n"+
      "Lock Status: ACTIVE\\n"+
      "Reason: %s\\n\\n"+
      "Trading is disabled to protect your account.\\n"+
      "Unlock is scheduled automatically tomorrow.\\n"+
      "=========================================",
      lockReason
   ));
   
   PlaySound("alert.wav");
}
`;
        const blob = new Blob([mql5Code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'GuardAI_Bridge.mq5';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    /**
     * Refreshes the risk profile and stats from the API.
     * Invoked on mount and after settings updates.
     */
    const refreshData = async () => {
        try {
            const [riskProfile, journalStats] = await Promise.all([
                riskService.getProfile(),
                journalService.getStats()
            ]);
            setProfile(riskProfile);
            setStats(journalStats);

            // Pre-fill form inputs with existing limits.
            setNewMaxLoss(riskProfile.max_daily_loss);
            setNewMaxTrades(riskProfile.max_trades_per_day);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    /**
     * Attempts to save new risk thresholds.
     * BLOCKED BY BACKEND if the user is currently in a "Locked" violation state.
     */
    const handleUpdateSettings = async () => {
        if (profile.is_locked) {
            setMessage("Cannot update limits while terminal is locked.");
            return;
        }
        setUpdating(true);
        try {
            await riskService.updateProfile({
                max_daily_loss: parseFloat(newMaxLoss),
                max_trades_per_day: parseInt(newMaxTrades)
            });
            setShowSettings(false);
            refreshData();
        } catch (e: any) {
            // Friendly error if the backend rejects the change (Integrity Check).
            setMessage(e.response?.data?.[0] || "Update failed");
        } finally {
            setUpdating(false);
        }
    };

    if (loading && !profile) return (
        <div className="h-96 flex flex-col items-center justify-center p-8 text-center bg-surface border border-border rounded-2xl">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-text-dim font-mono uppercase tracking-widest">Loading Safety Settings...</p>
        </div>
    );

    const lossPercentage = Math.min((parseFloat(profile.current_daily_loss) / parseFloat(profile.max_daily_loss)) * 100, 100);
    const riskColor = profile.is_locked ? 'bg-danger' : lossPercentage > 80 ? 'bg-orange-600' : 'bg-primary';

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-text-main flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">shield</span>
                        Risk Guardian
                    </h2>
                    <p className="text-text-dim">Protecting Your Account</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg border transition-all ${showSettings ? 'bg-primary border-primary text-text-main' : 'border-border text-text-dim hover:text-text-main'}`}
                    >
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                    <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-full">
                        <div className={`size-2 rounded-full ${profile.is_locked ? 'bg-danger' : 'bg-success'} animate-pulse`}></div>
                        <span className={`text-xs font-mono ${profile.is_locked ? 'text-danger' : 'text-success'}`}>
                            {profile.is_locked ? 'LOCKED' : 'ACTIVE'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Settings Overlay */}
            {showSettings && (
                <div className="glass-card rounded-3xl p-8 mb-8 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-text-main uppercase tracking-widest">Change Safety Limits</h3>
                        <button onClick={() => setShowSettings(false)} className="material-symbols-outlined text-text-dim hover:text-text-main">close</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Daily Loss Limit ($)</label>
                            <input
                                type="number"
                                value={newMaxLoss}
                                onChange={(e) => setNewMaxLoss(e.target.value)}
                                className="terminal-input w-full"
                                placeholder="E.g. 200.00"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 px-1">Max Daily Trades</label>
                            <input
                                type="number"
                                value={newMaxTrades}
                                onChange={(e) => setNewMaxTrades(e.target.value)}
                                className="terminal-input w-full"
                                placeholder="E.g. 5"
                            />
                        </div>
                    </div>

                    {message && (
                        <p className="text-danger text-[10px] font-black uppercase tracking-widest mt-4 animate-pulse">{message}</p>
                    )}

                    <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
                        <button
                            onClick={async () => {
                                if (confirm("DANGER: This will delete ALL strategies, trades, and reset your risk limits. Continue?")) {
                                    setUpdating(true);
                                    await journalService.fullReset();
                                    setShowSettings(false);
                                    refreshData();
                                }
                            }}
                            className="text-[10px] font-black text-danger/50 hover:text-danger flex items-center gap-2 transition-all uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-sm">delete_forever</span>
                            Clear My Account
                        </button>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-6 py-2 text-[10px] font-black text-text-dim hover:text-text-main transition-colors uppercase tracking-widest"
                            >Cancel</button>
                            <button
                                onClick={handleUpdateSettings}
                                disabled={updating || profile.is_locked}
                                className={`btn-primary px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${updating ? 'opacity-50' : ''}`}
                            >
                                {updating ? 'SAVING...' : 'SAVE SETTINGS'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lock Overlay */}
            {profile.is_locked && (
                <div className="bg-danger/10 border-2 border-danger p-4 md:p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 animate-in slide-in-from-top-4 duration-500 group">
                    <div className="p-3 md:p-4 bg-danger rounded-2xl text-text-main shadow-lg shadow-danger/20">
                        <span className="material-symbols-outlined text-2xl md:text-3xl">lock</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-text-main uppercase tracking-tighter">Trading Pause</h3>
                        <p className="text-danger font-mono text-xs md:text-sm font-bold">{profile.lock_reason}</p>
                    </div>

                    {profile.locked_at && (
                        <LockCountdown lockedAt={profile.locked_at} onComplete={refreshData} />
                    )}

                    {!profile.locked_at && (
                        <p className="text-[10px] text-text-dim max-w-[150px] text-right italic font-serif hidden md:block">
                            Discipline is the key to profit.
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily P&L Card */}
                <div className="p-8 bg-surface rounded-2xl border border-border relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-9xl">trending_down</span>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-bold text-text-dim text-xs uppercase tracking-widest flex items-center gap-2">
                            Daily Loss
                        </h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="flex items-baseline gap-2">
                            <span className={`text-5xl font-mono font-black ${profile.is_locked ? 'text-danger' : 'text-text-main'}`}>
                                ${parseFloat(profile.current_daily_loss).toFixed(2)}
                            </span>
                            <span className="text-text-dim font-mono text-xl">/ ${parseFloat(profile.max_daily_loss).toFixed(0)}</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] text-text-dim uppercase font-black tracking-widest">
                                <span>Risk Exposure</span>
                                <span>{lossPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-3 bg-surface/50 rounded-full overflow-hidden p-[2px] shadow-inner border border-border">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)] ${riskColor}`}
                                    style={{ width: `${lossPercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 flex justify-between items-center">
                            <span className="text-xs text-text-dim uppercase font-bold">Safe to Lose</span>
                            <span className="font-mono font-bold text-text-main">
                                ${(parseFloat(profile.max_daily_loss) - parseFloat(profile.current_daily_loss)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trade Limit Card */}
                <div className="p-8 bg-surface rounded-2xl border border-border shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                        <h3 className="font-bold text-text-dim text-xs uppercase tracking-widest">Daily Frequency</h3>
                        <span className="text-3xl font-mono font-black text-text-main">
                            {profile.trades_today} <span className="text-text-dim text-xl">/ {profile.max_trades_per_day}</span>
                        </span>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-10">
                        {Array.from({ length: profile.max_trades_per_day }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${i < profile.trades_today
                                    ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                    : 'border-slate-800 bg-slate-900/50 text-slate-700'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {i < profile.trades_today ? 'bolt' : 'circle'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-background rounded-2xl border border-border flex flex-col gap-2">
                        <div className="flex justify-between text-[10px] font-bold text-text-dim uppercase">
                            <span>Signals Detected Today</span>
                            <span>{profile.trades_today}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-text-dim uppercase">
                            <span>Limit Used</span>
                            <span className={profile.trades_today >= profile.max_trades_per_day ? 'text-danger' : 'text-success'}>
                                {((profile.trades_today / profile.max_trades_per_day) * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MetaTrader 5 EA Integration Card */}
            <div className="p-8 bg-surface rounded-2xl border border-border shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="material-symbols-outlined text-9xl">terminal</span>
                </div>

                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500"></div>

                <h3 className="font-bold text-text-dim text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">settings_ethernet</span>
                    MetaTrader 5 Real-Time Safeguard
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                    <div className="lg:col-span-2 space-y-4">
                        <p className="text-sm text-text-main leading-relaxed">
                            Protect your balance directly from your broker account. Drag our zero-cost **Safeguard Expert Advisor (EA)** onto your MetaTrader 5 charts. It works seamlessly with desktop terminals and mobile platforms (via VPS cloud setups).
                        </p>
                        
                        <div className="space-y-2.5">
                            <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">Installation Instructions:</h4>
                            <ul className="text-xs text-text-dim space-y-2 list-decimal list-inside px-1">
                                <li>Click <strong className="text-primary cursor-pointer hover:underline" onClick={downloadMQL5File}>Download EA Bridge</strong> and save the file.</li>
                                <li>In MT5, go to <strong>File ➔ Open Data Folder</strong>, then paste the file into <strong>MQL5 ➔ Experts</strong>.</li>
                                <li>In Navigator panel, right-click <em>Expert Advisors</em> ➔ <em>Refresh</em>, then drag <strong>GuardAI_Bridge</strong> onto any chart.</li>
                                <li>Enable connection: Go to <strong>Tools ➔ Options ➔ Expert Advisors</strong>, check <em>Allow WebRequest</em> and add your server URL.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col justify-between p-6 bg-background rounded-2xl border border-border">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Bridge Connection</span>
                                <div className="flex items-center gap-1.5 bg-surface border border-border px-2.5 py-1 rounded-full">
                                    <div className={`size-2 rounded-full ${profile.is_locked ? 'bg-danger' : 'bg-success animate-pulse'}`}></div>
                                    <span className={`text-[9px] font-mono font-bold ${profile.is_locked ? 'text-danger' : 'text-success'}`}>
                                        {profile.is_locked ? 'LOCKED' : 'SYNC ACTIVE'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-dim">Enforcement Mode</span>
                                    <span className="font-mono text-text-main font-bold uppercase">Automated EA</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-dim">Sync Endpoint</span>
                                    <span className="font-mono text-[10px] text-primary truncate max-w-[130px]" title={`${window.location.origin}/api/risk/mt5-sync/`}>
                                        {window.location.origin.replace('http://', '').replace('https://', '')}/...
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={downloadMQL5File}
                            className="btn-primary w-full py-2.5 mt-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Download EA Bridge
                        </button>
                    </div>
                </div>
            </div>

            {/* Performance Ledger Integration */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Win Rate', val: `${stats?.win_rate || 0}%`, icon: 'speed' },
                    { label: 'Discipline', val: `${stats?.discipline_rate || 0}%`, icon: 'psychology' },
                    { label: 'Net Yield', val: `$${stats?.total_pnl || 0}`, icon: 'payments' },
                    { label: 'Profit Factor', val: `${stats?.profit_factor || '—'}`, icon: 'balance' },
                    { label: 'Avg R:R', val: `${stats?.avg_rr || '—'}`, icon: 'compare_arrows' },
                    { label: 'Max Drawdown', val: stats?.max_drawdown ? `-$${stats.max_drawdown}` : '—', icon: 'trending_down' },
                    { label: '🔥 Best Streak', val: `${stats?.max_win_streak || 0}`, icon: 'local_fire_department' },
                    { label: '❄️ Worst Streak', val: `${stats?.max_loss_streak || 0}`, icon: 'ac_unit' }
                ].map((s, i) => (
                    <div key={i} className="bg-surface border border-border p-4 rounded-2xl flex flex-col items-center">
                        <span className="material-symbols-outlined text-text-dim text-sm mb-2">{s.icon}</span>
                        <p className="text-[10px] text-text-dim font-bold uppercase mb-1">{s.label}</p>
                        <p className="text-text-main font-mono font-bold">{s.val}</p>
                    </div>
                ))}
            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={refreshData}
                    className="flex items-center gap-2 text-[10px] font-bold text-text-dim hover:text-text-main transition-colors uppercase tracking-widest border border-border px-6 py-2 rounded-full"
                >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Refresh Status
                </button>
            </div>
        </div>
    );
};

export default RiskGuardian;

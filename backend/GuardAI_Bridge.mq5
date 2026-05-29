//+------------------------------------------------------------------+
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
   
   // Start background timer
   EventSetTimer(SyncIntervalSeconds);
   
   // Run initial sync
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
      Print("[Guard AI] CRITICAL: Order activity detected while account is locked! Liquidating immediately...");
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
   
   // 1. Build position list to send as JSON
   string positionsJson = "";
   int totalPositions = PositionsTotal();
   int activeCount = 0;
   
   for(int i = 0; i < totalPositions; i++)
   {
      // Select the position by index
      string symbol = PositionGetSymbol(i);
      ulong ticket = PositionGetInteger(POSITION_TICKET);
      
      if(ticket > 0 && symbol != "")
      {
         double pnl = PositionGetDouble(POSITION_PROFIT);
         long type = PositionGetInteger(POSITION_TYPE); // 0 = Buy, 1 = Sell
         
         if(activeCount > 0) positionsJson += ",";
         positionsJson += StringFormat("{\"ticket\": %d, \"symbol\": \"%s\", \"pnl\": %.2f, \"type\": %d}", ticket, symbol, pnl, type);
         activeCount++;
      }
   }
   
   // Formulate JSON Payload
   string jsonPayload = StringFormat(
      "{\"balance\": %.2f, \"equity\": %.2f, \"positions\": [%s]}",
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      positionsJson
   );
   
   StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   // Set up HTTP Authorization Headers
   string headers = "Content-Type: application/json\r\n";
   headers += "Authorization: Token " + AuthToken + "\r\n";
   
   int timeout = 4000; // 4 seconds
   
   // Execute high-speed HTTP WebRequest
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
      
      // Resilient light-weight parsing without external libraries
      if(StringFind(responseText, "\"is_locked\":true") != -1)
      {
         isLocked = true;
         // Extract reason if present
         int reasonIndex = StringFind(responseText, "\"lock_reason\":\"");
         if(reasonIndex != -1)
         {
            int start = reasonIndex + 15;
            int end = StringFind(responseText, "\"", start);
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
      Print("[Guard AI] Sync Connection Failure. Code: ", responseCode, " | Error Code: ", GetLastError());
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
   
   if(totalPositions > 0)
   {
      Print("[Guard AI] MANDATORY CAPITAL LOCK ACTIVE: Closing all open positions...");
   }
   
   // Loop backwards to safely close active positions
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
         
         // Select bid/ask price depending on position side to execute matching exit order
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
         if(!OrderSend(request, tradeResult))
         {
            Print("[Guard AI] Failed to close position #", ticket, ". Error: ", GetLastError());
         }
         else
         {
            Print("[Guard AI] Successfully closed open position #", ticket);
         }
      }
   }
   
   // Clear all active pending limit/stop orders to prevent entry
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
         if(!OrderSend(request, tradeResult))
         {
            Print("[Guard AI] Failed to delete pending entry #", ticket, ". Error: ", GetLastError());
         }
         else
         {
            Print("[Guard AI] Successfully removed pending entry #", ticket);
         }
      }
   }
   
   // Trigger visual dashboard warning
   Comment(StringFormat(
      "=========================================\n"+
      "   GUARD AI: CAPITAL PROTECTION BLOCK   \n"+
      "=========================================\n"+
      "Lock Status: ACTIVE\n"+
      "Reason: %s\n\n"+
      "Trading is disabled to protect your account.\n"+
      "Unlock is scheduled automatically tomorrow.\n"+
      "=========================================",
      lockReason
   ));
   
   // Sound the disciplinary buzzer
   PlaySound("alert.wav");
}

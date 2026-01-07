
import { GoogleGenAI, Type } from "@google/genai";
import { TradeSignal, MarketPair } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeMarketVolatility = async (pairs: MarketPair[]): Promise<string> => {
  const prompt = `Analyze the following market data and identify the top 3 most volatile pairs with trading opportunities:
  ${JSON.stringify(pairs)}
  
  Provide a concise summary of why they are volatile and what a trader should watch out for. Use professional trading terminology.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "Unable to analyze market at this time.";
};

export const generateTradeSignals = async (pair: string, currentPrice: number): Promise<TradeSignal[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze ${pair} at price ${currentPrice}. Generate a high-probability trade signal including Entry, TP, SL, and reasoning based on technical analysis patterns.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            pair: { type: Type.STRING },
            action: { type: Type.STRING, enum: ['BUY', 'SELL'] },
            entry: { type: Type.NUMBER },
            tp: { type: Type.NUMBER },
            sl: { type: Type.NUMBER },
            strength: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["pair", "action", "entry", "tp", "sl", "strength", "reasoning"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse trade signals", e);
    return [];
  }
};

export const interpretStrategy = async (description: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `As a senior quantitative developer and market analyst, interpret this trading strategy: "${description}". 
    
    CRITICAL: 
    1. Identify the EXACT instrument/asset mentioned (e.g., Gold (XAU/USD), BTC/USDT, EUR/USD). If none is mentioned, assume BTC/USDT but flag it.
    2. Perform a simulated "AI Backtest" using recent historical market context to estimate how this strategy would have performed over the last 100 trades.
    3. Return structured data including a summary, asset name, risk rating, simulations, and backtest results.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          asset: { type: Type.STRING, description: "The specific asset identified from description." },
          summary: { type: Type.STRING },
          riskRating: { type: Type.STRING },
          backtest: {
            type: Type.OBJECT,
            properties: {
              winRate: { type: Type.NUMBER, description: "Percentage from 0-100" },
              totalTrades: { type: Type.NUMBER },
              profitFactor: { type: Type.NUMBER },
              drawdown: { type: Type.NUMBER, description: "Max drawdown percentage" }
            },
            required: ["winRate", "totalTrades", "profitFactor", "drawdown"]
          },
          simulations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scenario: { type: Type.STRING },
                action: { type: Type.STRING },
                result: { type: Type.STRING },
                pnl: { type: Type.STRING }
              }
            }
          }
        },
        required: ["asset", "summary", "riskRating", "backtest", "simulations"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { summary: "Failed to parse strategy.", asset: "Unknown", simulations: [], backtest: { winRate: 0, totalTrades: 0, profitFactor: 0, drawdown: 0 } };
  }
};

export const chatWithPartner = async (history: {role: string, content: string}[], message: string) => {
  const contents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.content }]
  }));
  
  contents.push({ role: 'user', parts: [{ text: message }] });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents,
    config: {
      systemInstruction: "You are Guard AI, a world-class trading partner for Forex and Crypto. You specialize in risk management, strategy optimization, and psychological discipline. Your tone is professional, analytical, and strictly focused on trading success. Help the user refine strategies or warn them if they seem impulsive."
    }
  });

  return response.text || "I'm processing the data. Please standby.";
};

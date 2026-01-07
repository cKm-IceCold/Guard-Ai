
export enum AssetType {
  FOREX = 'FOREX',
  CRYPTO = 'CRYPTO'
}

export interface MarketPair {
  symbol: string;
  price: number;
  change24h: number;
  volatility: number; // 0-100 score
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  type: AssetType;
}

export interface TradingRule {
  id: string;
  name: string;
  value: number;
  unit: string;
  active: boolean;
}

export interface RiskProfile {
  maxDailyLoss: number;
  maxDrawdown: number;
  maxTradesPerDay: number;
  currentDailyLoss: number;
  tradesToday: number;
  isLocked: boolean;
  lockReason?: string;
}

export interface TradeSignal {
  pair: string;
  action: 'BUY' | 'SELL';
  entry: number;
  tp: number;
  sl: number;
  strength: number; // 0-100
  reasoning: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

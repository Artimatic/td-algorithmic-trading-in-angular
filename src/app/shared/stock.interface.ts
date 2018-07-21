export interface Stock {
  stock: string;
  totalReturns: number;
  lastVolume: number;
  lastPrice: number;
  totalTrades: number;
  trending?: string;
  recommendation?: string;
  algo ?: string;
  returns ?: number;
  strongbuys ?: string[];
  strongsells ?: string[];
  buys ?: string[];
  sells ?: string[];
}

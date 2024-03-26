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
  strongbuySignals ?: string[];
  strongsellSignals ?: string[];
  buySignals ?: string[];
  sellSignals ?: string[];
  impliedMovement ?: number;
  macdBearishShortTerm?: number;
  macdBearishMidTerm?: number;
  macdBearish?: number;
  macdBullishShortTerm?: number;
  macdBullishMidTerm?: number;
  macdBullish?: number;
  rocBearishShortTerm?: number;
  rocBearishMidTerm?: number;
  rocBearish?: number;
  rocBullishShortTerm?: number;
  rocBullishMidTerm?: number;
  rocBullish?: number;
  mfiBearishShortTerm?: number;
  mfiBearishMidTerm?: number;
  mfiBearish?: number;
  mfiBullishShortTerm?: number;
  mfiBullishMidTerm?: number;
  mfiBullish?: number;
  mfiTradeBearishShortTerm?: number;
  mfiTradeBearishMidTerm?: number;
  mfiTradeBearish?: number;
  mfiTradeBullishShortTerm?: number;
  mfiTradeBullishMidTerm?: number;
  mfiTradeBullish?: number;
  bbandBearishShortTerm?: number;
  bbandBearishMidTerm?: number;
  bbandBearish?: number;
  bbandBullishShortTerm?: number;
  bbandBullishMidTerm?: number;
  bbandBullish?: number;
  profitableTrades?: number;
  bearishProbability?: number;
  bullishProbability?: number;
  previousImpliedMovement?: number;
  kellyCriterion?: number;
  ml?: any;
  optionsVolume?: number;
  marketCap?: number;
  high52?: number;
}


export interface Recommendation {
    name?: string,
    time?: string,
    recommendation: OrderType;
    mfi?: DaytradeRecommendation;
    roc?: DaytradeRecommendation;
    bband?: DaytradeRecommendation;
    vwma?: DaytradeRecommendation;
    mfiTrade?: DaytradeRecommendation;
    macd?: DaytradeRecommendation;
    demark9?: DaytradeRecommendation;
    mfiLow?: DaytradeRecommendation;
    mfiDivergence?: DaytradeRecommendation;
    mfiDivergence2?: DaytradeRecommendation;
    overboughtMomentum?: DaytradeRecommendation;
    data?: any;
}

export enum DaytradeRecommendation {
    Bullish = 'Bullish',
    Bearish = 'Bearish',
    Neutral = 'Neutral'
}

export enum OrderType {
    Buy = 'Buy',
    Sell = 'Sell',
    None = 'None'
}

export interface Indicators {
    vwma: number;
    mfiLeft: number;
    bband80: any[];
    mfiPrevious?: number;
    macd?: any;
    roc10?: number;
    roc10Previous?: number;
    roc70?: number;
    roc70Previous?: number;
    close?: number;
    recommendation?: Recommendation;
    action?: string;
    date?: string;
    demark9?: any;
    mfiLow?: number;
    high?: number;
    low?: number;
    mfiTrend?: boolean;
    macdPrevious?: any;
}
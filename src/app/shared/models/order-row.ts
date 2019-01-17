export interface OrderRow {
    symbol: string;
    quantity: number;
    price: number;
    side: string;
    Stop?: number;
    Target?: number;
    StopLoss?: boolean;
    TakeProfit?: boolean;
    MeanReversion1?: boolean;
    Mfi?: boolean;
    SpyMomentum?: boolean;
    OrderSize?: number;
}

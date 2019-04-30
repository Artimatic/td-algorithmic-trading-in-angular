export interface OrderRow {
    symbol: string;
    quantity: number;
    price: number;
    side: string;
    Stop?: number;
    TrailingStop?: number;
    Target?: number;
    StopLoss?: boolean;
    TrailingStopLoss?: boolean;
    TakeProfit?: boolean;
    MeanReversion1?: boolean;
    Mfi?: boolean;
    SpyMomentum?: boolean;
    BuyCloseSellOpen?: boolean;
    SellAtClose?: boolean;
    YahooData?: boolean;
    OrderSize?: number;
}

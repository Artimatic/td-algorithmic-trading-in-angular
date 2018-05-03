export interface OrderRow {
    symbol: string;
    quantity: number;
    price: number;
    side: string;
    Stop?: number;
    Target?: number;
    StopLoss?: boolean;
    TakeProfit?: boolean;
    OrderSize?: number;
}

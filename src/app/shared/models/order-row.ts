export interface OrderRow {
    symbol: string;
    quantity: number;
    price: number;
    side: string;
    Stop?: number;
    Target?: number;
    StopLoss?: boolean;
    TakeProfit?: boolean;
    UseMomentum1?: boolean;
    UseMomentum2?: boolean;
    OrderSize?: number;
}

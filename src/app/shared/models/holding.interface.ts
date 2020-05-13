export interface Holding {
    quantity?: number;
    average_buy_price?: number;
    created_at?: Date;
    updated_at?: Date;
    instrument: string;
    symbol: string;
    name?: string;
    realtime_price?: number;
    Volume?: number;
    gainz?: number;
    diversification?: number;
    shares_held_for_sells?: number;
}

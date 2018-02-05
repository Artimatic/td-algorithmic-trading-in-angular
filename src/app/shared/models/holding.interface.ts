export interface Holding {
    quantity: number,
    average_buy_price: number,
    created_at: Date,
    updated_at: Date,
    instrument: string,
    symbol?: string,
    name?: string,
    realtime_price?: number,
    Volume?: number,
    PERatio?: number,
    realtime_chg_percent?: number,
    gainz?: number
}

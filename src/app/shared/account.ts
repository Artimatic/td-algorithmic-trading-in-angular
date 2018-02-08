export interface Account {
    unsettled_funds?: number,
    uncleared_deposits?: number,
    unsettled_debit?: number,
    url?: string,
    cash?: number,
    cash_held_for_orders?: number,
    buying_power?: number,
    stocks?: number
}
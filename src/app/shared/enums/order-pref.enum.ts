export enum OrderPref {
    TakeProfit = 'Take Profit',
    StopLoss = 'Stop Loss',
    SellAtClose = 'Sell positions at close',
    TrailingStopLoss = 'Trailing Stop Loss',
    BuyCloseSellOpen = 'Buy at Close, Sell at Open',
    SellAtOpen = 'Sell positions at Open',
    BuyAt3SellBeforeClose = 'Buy at 3pm, Sell before Close',
    MlBuySellAtClose = 'Activate ML model to determine Buy/Sell at close'
}

export enum OrderPref {
    TakeProfit = 'Take Profit',
    StopLoss = 'Stop Loss',
    SellAtClose = 'Sell positions on the close',
    TrailingStopLoss = 'Trailing Stop Loss',
    BuyCloseSellOpen = 'Buy on the Close, Sell on the Open',
    SellAtOpen = 'Sell positions on the Open',
    BuyAt3SellBeforeClose = 'Buy at 3pm, Sell before the Close',
    MlBuySellAtClose = 'ML model Buy/Sell on the close',
    ExecuteOrderIfOpenUp = 'Execute order only if stock opens up',
    ExecuteOrderIfOpenDown = 'Execute order only if stock opens down',
}

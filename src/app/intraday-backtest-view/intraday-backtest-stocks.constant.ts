import { OrderRow } from '../shared/models/order-row';
import { stockList } from '../rh-table/backtest-stocks.constant';

function createRow(ticker: string): OrderRow {
  return {
    symbol: ticker,
    price: 10,
    quantity: 100,
    side: 'DayTrade',
    Stop: 0.003,
    TrailingStop: 0.001,
    Target: 0.02,
    StopLoss: true,
    TrailingStopLoss: true,
    TakeProfit: true,
    SellAtClose: true,
    OrderSize: 10
  };
}

const IntradayStocks: OrderRow[] = [];

for (const s of stockList) {
  IntradayStocks.push(createRow(s));
}

export default IntradayStocks;

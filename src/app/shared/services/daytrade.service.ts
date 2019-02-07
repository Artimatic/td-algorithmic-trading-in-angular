import { Injectable } from '@angular/core';
import { BacktestService } from './backtest.service';
import { AuthenticationService } from './authentication.service';
import { PortfolioService } from './portfolio.service';
import { OrderPref } from '../enums/order-pref.enum';
import { SmartOrder } from '../models/smart-order';

import * as moment from 'moment';
import * as _ from 'lodash';

@Injectable()
export class DaytradeService {

  constructor(private backtestService: BacktestService,
    private authenticationService: AuthenticationService,
    private portfolioService: PortfolioService) { }

  getDefaultOrderSize(quantity) {
    return Math.ceil(quantity / 3);
  }

  async getBBand(reals: number[], period): Promise<any[]> {
    const body = {
      real: this.fillInMissingReals(reals),
      period: period,
      stddev: 2
    };

    return await this.backtestService.getBBands(body).toPromise();
  }

  async getSMA(reals: number[], period): Promise<any[]> {
    const body = {
      real: this.fillInMissingReals(reals),
      period: period
    };

    return await this.backtestService.getSMA(body).toPromise();
  }

  async getMFI(high: number[], low: number[], close: number[], volume: number[], period: number): Promise<any[]> {
    const body = {
      high,
      low,
      close,
      volume,
      period
    };

    return await this.backtestService.getMFI(body).toPromise();
  }


  async getROC(reals: number[], period): Promise<any[]> {
    const body = {
      real: this.fillInMissingReals(reals),
      period: period
    };

    return await this.backtestService.getROC(body).toPromise();
  }

  fillInMissingReals(reals: number[]) {
    for (let i = 1, length = reals.length; i < length; i++) {
      if (!reals[i]) {
        if (reals[i - 1] && reals[i + 1]) {
          reals[i] = (reals[i - 1] + reals[i + 1]) / 2;
        }
      }
    }
    return reals;
  }

  private minutesOfDay(minutes: moment.Moment) {
    return minutes.minutes() + minutes.hours() * 60;
  }

  tradePeriod(time: moment.Moment, start: moment.Moment, noon: moment.Moment, end: moment.Moment) {
    let period: String = 'pre';
    const minutes = this.minutesOfDay(time);
    if (minutes > this.minutesOfDay(start)) {
      period = 'morning';
    }
    if (minutes > this.minutesOfDay(noon)) {
      period = 'afternoon';
    }
    if (minutes > this.minutesOfDay(end)) {
      period = 'after';
    }

    return period;
  }

  parsePreferences(preferences) {
    const config = {
      TakeProfit: false,
      StopLoss: false,
      MeanReversion1: false,
      Mfi: false,
      SpyMomentum: false,
      useYahooData: false
    };

    if (preferences) {
      preferences.forEach((value) => {
        switch (value) {
          case OrderPref.TakeProfit:
            config.TakeProfit = true;
            break;
          case OrderPref.StopLoss:
            config.StopLoss = true;
            break;
          case OrderPref.MeanReversion1:
            config.MeanReversion1 = true;
            break;
          case OrderPref.Mfi:
            config.Mfi = true;
            break;
          case OrderPref.SpyMomentum:
            config.SpyMomentum = true;
            break;
          case OrderPref.useYahooData:
            config.useYahooData = true;
            break;
        }
      });
    }
    return config;
  }

  getOrderQuantity(maxAllowedOrders: number,
    orderSize: number,
    ordersAlreadyMade: number): number {
    if (ordersAlreadyMade >= maxAllowedOrders) {
      return 0;
    }

    if (orderSize + ordersAlreadyMade > maxAllowedOrders) {
      return maxAllowedOrders - ordersAlreadyMade;
    }

    return orderSize;
  }

  getBuyOrderQuantity(maxAllowedOrders: number,
    orderSize: number,
    ordersAlreadyMade: number,
    positionCount: number): number {
    if (positionCount > orderSize) {
      return 0;
    }

    if (ordersAlreadyMade >= maxAllowedOrders) {
      return 0;
    }

    if (orderSize + ordersAlreadyMade > maxAllowedOrders) {
      return maxAllowedOrders - ordersAlreadyMade;
    }

    return orderSize;
  }

  sendBuy(buyOrder: SmartOrder, type: string, resolve, reject) {
    this.authenticationService.getPortfolioAccount().subscribe(account => {
      this.portfolioService.buy(buyOrder.holding, buyOrder.quantity, buyOrder.price, type).subscribe(
        response => {
          resolve(response);
        },
        error => {
          reject(error);
        });
    });
    return buyOrder;
  }

  sendSell(sellOrder: SmartOrder, type: string, resolve: Function, reject: Function, handleNotFound: Function): SmartOrder {
    this.authenticationService.getPortfolioAccount().subscribe(account => {
      this.portfolioService.getPortfolio()
        .subscribe(result => {
          const foundPosition = result.find((pos) => {
            return pos.instrument === sellOrder.holding.instrument;
          });

          if (foundPosition) {
            const positionCount = Number(foundPosition.quantity);
            if (positionCount === 0) {
              handleNotFound();
            } else {
              sellOrder.quantity = sellOrder.quantity < positionCount ? sellOrder.quantity : positionCount;

              let price = sellOrder.price;

              if (type === 'market') {
                price = null;
              }

              this.portfolioService.sell(sellOrder.holding, sellOrder.quantity, price, type).subscribe(
                response => {
                  resolve(response);
                },
                error => {
                  reject(error);
                });
            }
          } else {
            handleNotFound();
          }
        });
    },
      error => {
        reject();
      });
    return sellOrder;
  }

  buildTileList(orders: SmartOrder[]): any[] {
    let currentList: any[] = [];
    const tiles = [];

    for (let i = 0, len = orders.length; i < len; ++i) {
      let action = orders[i].side.toLowerCase();
      if (action === 'buy') {
        action = 'Bought';
      } else if (action === 'sell') {
        action = 'Sold';
      }
      const orderRow = {
        timeSubmitted: moment.unix(orders[i].timeSubmitted).format('hh:mm'),
        signalTime: moment(orders[i].signalTime).format('hh:mm'),
        quantity: orders[i].quantity,
        price: orders[i].price,
        action
      };

      currentList.push(orderRow);
      if (currentList.length >= 5) {
        tiles.push({ orders: currentList, cols: 1, rows: 1 });
        currentList = [];
      }
    }

    tiles.push({ orders: currentList, cols: 1, rows: 1 });


    return tiles;
  }

  createOrder(holding, side: string, quantity: number, price: number, signalTime: number): SmartOrder {
    return {
      holding: holding,
      quantity: quantity,
      price: _.round(Number(price), 2),
      submitted: false,
      pending: false,
      side: side,
      timeSubmitted: moment().unix(),
      signalTime: moment.unix(signalTime).valueOf()
    };
  }

  getPercentChange(currentPrice: number, boughtPrice: number) {
    if (boughtPrice === 0 || currentPrice === boughtPrice) {
      return 0;
    } else {
      return (currentPrice - boughtPrice) / boughtPrice;
    }
  }

  // calculatePercentDifference(v1, v2) {
  //   return _.divide(_.subtract(v1, v2), _.divide(_.add(v1, v2), 2));
  // }

  calculatePercentDifference(v1, v2) {
    return Math.abs(Math.abs(v1 - v2) / ((v1 + v2) / 2));
  }

  addChartData(data, newData) {
    const date = moment(newData.date);
    const lastPrice = newData.price ? newData.price.last : null;
    const lastVolume = newData.price ? newData.price.volume : null;

    data.chart.result[0].timestamp.push(date.unix());
    data.chart.result[0].indicators.quote[0].close.push(lastPrice || newData.close);
    data.chart.result[0].indicators.quote[0].low.push(lastPrice || newData.low);
    data.chart.result[0].indicators.quote[0].volume.push(lastVolume || newData.volume);
    data.chart.result[0].indicators.quote[0].open.push(lastPrice || newData.open);
    data.chart.result[0].indicators.quote[0].high.push(lastPrice || newData.high);
    return data;
  }

  addQuote(data, newQuote) {
    const quotes = data.chart.result[0].indicators.quote[0];
    quotes.close[quotes.close.length - 1] = 1 * newQuote.last_trade_price;
    return data;
  }

  createNewChart() {
    return {
      chart: {
        result: [
          {
            timestamp: [],
            indicators: {
              quote: [
                {
                  low: [],
                  volume: [],
                  open: [],
                  high: [],
                  close: []
                }
              ]
            }
          }
        ]
      }
    };
  }

  getSubArray(reals: number[], period) {
    return _.slice(reals, reals.length - (period + 1));
  }

  estimateAverageBuyOrderPrice(orders: SmartOrder[]): number {
    if (orders.length === 0) {
      return 0;
    }

    const finalPositions: SmartOrder[] = [];

    _.forEach(orders, (currentOrder: SmartOrder) => {
      if (currentOrder.side.toLowerCase() === 'sell') {
        let sellSize: number = currentOrder.quantity;
        let i = 0;
        while (sellSize > 0 && i < finalPositions.length) {
          if (finalPositions[i].side.toLowerCase() === 'buy') {
            if (finalPositions[i].quantity > sellSize) {
              finalPositions[i].quantity -= sellSize;
              sellSize = 0;
            } else {
              const removed = finalPositions.shift();
              sellSize -= removed.quantity;
              i--;
            }
          }
          i++;
        }
      } else if (currentOrder.side.toLowerCase() === 'buy') {
        finalPositions.push(currentOrder);
      }
    });

    let sum = 0;
    let size = 0;

    _.forEach(finalPositions, (pos: SmartOrder) => {
      sum += _.multiply(pos.quantity, pos.price);
      size += pos.quantity;
    });

    if (sum === 0 || size === 0) {
      return 0;
    }

    return _.round(_.divide(sum, size), 2);
  }

  /*
  * Estimate the profit/loss of the last sell order
  */
  estimateSellProfitLoss(orders: SmartOrder[]) {
    const len = orders.length;
    if (len < 2) {
      return 0;
    }

    const lastOrder = orders[len - 1];

    if (lastOrder.side.toLowerCase() !== 'sell') {
      throw new Error(`Estimating sell p/l: ${orders[orders.length - 1]} is not a sell order.`);
    }

    const finalPositions: SmartOrder[] = [];

    for (let j = 0, c = len - 1; j < c; j++) {
      const currentOrder: SmartOrder = orders[j];
      if (currentOrder.side.toLowerCase() === 'sell') {
        let sellSize: number = currentOrder.quantity;
        let i = 0;
        while (sellSize > 0 && i < finalPositions.length) {
          if (finalPositions[i].side.toLowerCase() === 'buy') {
            if (finalPositions[i].quantity > sellSize) {
              finalPositions[i].quantity -= sellSize;
              sellSize = 0;
            } else {
              const removed = finalPositions.shift();
              sellSize -= removed.quantity;
              i--;
            }
          }
          i++;
        }
      } else if (currentOrder.side.toLowerCase() === 'buy') {
        finalPositions.push(currentOrder);
      }
    }

    let size = lastOrder.quantity;
    let cost = 0;

    _.forEach(finalPositions, (pos: SmartOrder) => {
      if (pos.quantity > size) {
        cost += _.multiply(size, pos.price);
        size = 0;
      } else {
        cost += _.multiply(pos.quantity, pos.price);
        size -= pos.quantity;
      }

      if (size <= 0) {
        return false;
      }
    });

    const lastOrderCost = _.multiply(lastOrder.quantity, lastOrder.price);

    return _.round(_.subtract(lastOrderCost, cost), 2);
  }

  momentumV1(quotes, period, idx) {
    const beginningIdx = idx - period;
    if (beginningIdx >= 0) {
      if (quotes.close[idx] > quotes.close[beginningIdx]) {
        return 'buy';
      } else {
        return 'sell';
      }
    }
    return null;
  }

  momentumV2(quotes, period, idx) {
    const beginningIdx = idx - period;
    let smallSpreadCount = 0;
    if (beginningIdx >= 0) {
      for (let i = beginningIdx; i < idx; i++) {
        if (_.subtract(_.round(quotes.close[i], 2), _.round(quotes.open[i], 2)) === 0) {
          smallSpreadCount++;
        }
      }

      if (smallSpreadCount > 1 && smallSpreadCount < 4) {
        if (quotes.close[idx] > quotes.close[beginningIdx]) {
          return 'buy';
        } else {
          return 'sell';
        }
      } else {
        return 'unknown';
      }
    }
    return null;
  }

  async hasSpyBearMomentum(dataInterval: string, period: number) {
    const requestBody = {
      symbol: 'SPY',
      interval: dataInterval
    };

    const intraday = await this.backtestService.getIntraday2(requestBody).toPromise();
    const closePrices = _.get(intraday, 'chart.result[0].indicators.quote[0].close');
    const price = closePrices[closePrices.length - 1];

    const bands = await this.getBBand(closePrices, period);
    const lowerBand = bands[0][0];
    if (lowerBand > price) {
      return true;
    }
    return false;
  }

  findMostCurrentQuoteIndex(quotes, firstIndex, lastIndex) {
    // TODO: Replace with real time quote
    let ctr = 1,
      tFirstIndex = firstIndex,
      tLastIndex = lastIndex;

    while (!quotes[tLastIndex] && quotes[tFirstIndex] && ctr < 3) {
      tFirstIndex = firstIndex - ctr;
      tLastIndex = lastIndex - ctr;
      if (quotes[tFirstIndex] && quotes[tLastIndex]) {
        firstIndex = tFirstIndex;
        lastIndex = tLastIndex;
        break;
      } else if (!quotes[tFirstIndex]) {
        break;
      }
      ctr++;
    }
    return { firstIndex, lastIndex };
  }

  convertToFixedNumber(num, sig) {
    return _.round(Number(num), sig);
  }

  convertHistoricalQuotes(backtestQuotes) {
    const data = {
      chart: {
        result: [
          {
            timestamp: [],
            indicators: {
              quote: [
                {
                  low: [],
                  volume: [],
                  open: [],
                  high: [],
                  close: []
                }
              ]
            }
          }
        ]
      }
    };

    _.forEach(backtestQuotes, (historicalData) => {
      const date = moment(historicalData.date);
      data.chart.result[0].timestamp.push(date.unix());
      data.chart.result[0].indicators.quote[0].close.push(historicalData.close);
      data.chart.result[0].indicators.quote[0].low.push(historicalData.low);
      data.chart.result[0].indicators.quote[0].volume.push(historicalData.volume);
      data.chart.result[0].indicators.quote[0].open.push(historicalData.open);
      data.chart.result[0].indicators.quote[0].high.push(historicalData.high);
    });

    return data;
  }

  getIntradayYahoo(symbol: string) {
    return this.backtestService.getIntradayV3({
      symbol,
      interval: '1m',
      range: '1d'
    })
      .toPromise()
      .then((quotes) => {
        quotes.chart.result[0].indicators.quote[0].close =
          this.fillInMissingReals(_.get(quotes, 'chart.result[0].indicators.quote[0].close'));
        return this.portfolioService.getQuote(symbol)
          .toPromise()
          .then((quote) => {
            return this.addQuote(quotes, quote);
          });
      });
  }

  isOversoldBullish(roc: any[], momentum: number, mfi: number): boolean {
    const rocLen = roc[0].length - 1;
    const roc1 = _.round(roc[0][rocLen], 3);
    let num, den;
    if (momentum > roc1) {
      num = momentum;
      den = roc1;
    } else {
      den = momentum;
      num = roc1;
    }

    const momentumDiff = _.round(_.divide(num, den), 3);
    const rocDiffRange = [-0.4, 0.1];

    if (momentumDiff < rocDiffRange[0] || momentumDiff > rocDiffRange[1]) {
      if (mfi < 20) {
        return true;
      }
    }
    return false;
  }

  isMomentumBullish(price: number, high: number, mfi: number): boolean {
    if (price > high) {
      if (mfi > 55 && mfi < 80) {
        return true;
      }
    }
    return false;
  }

  isBBandMeanReversionBullish(price: number, low: number, mfi: number, roc: any[], momentum: number, ): boolean {
    const rocLen = roc[0].length - 1;
    const roc1 = _.round(roc[0][rocLen], 3);
    let num, den;
    if (momentum > roc1) {
      num = momentum;
      den = roc1;
    } else {
      den = momentum;
      num = roc1;
    }

    const momentumDiff = _.round(_.divide(num, den), 3);
    const rocDiffRange = [-0.4, 0.1];

    if (momentumDiff < rocDiffRange[0] || momentumDiff > rocDiffRange[1]) {
      if (price < low) {
        if (mfi > 0 && mfi < 36) {
          return true;
        }
      }
    }
    return false;
  }
}

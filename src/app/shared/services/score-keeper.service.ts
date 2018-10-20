import { Injectable } from '@angular/core';
import { Trade } from '../models/trade';
import { StockScore } from '../models/stock-score';

import * as _ from 'lodash';

@Injectable()
export class ScoreKeeperService {
  public profitLossHash = {};
  costEstimates = {};

  constructor() { }

  addProfitLoss(stock: string, sum: number) {
    const score: StockScore = {stock: stock, profitLoss: sum};
    if (this.profitLossHash[stock]) {
      this.profitLossHash[stock] += sum;
    } else {
      this.profitLossHash[stock] = sum;
    }

    this.profitLossHash[stock] = _.round(this.profitLossHash[stock], 2);
    console.log(`${stock}: ${this.profitLossHash[stock]}`);
  }

  updateCostEstimate(stock: string, price: number) {
    this.costEstimates[stock] = price;
  }

  addSell(stock: string, quantity: number, price: number) {
    const avgCost: number = this.costEstimates[stock];
    if (avgCost) {
      const gains = (quantity * price) - (avgCost * quantity);
      this.addProfitLoss(stock, gains);
    }
  }
}

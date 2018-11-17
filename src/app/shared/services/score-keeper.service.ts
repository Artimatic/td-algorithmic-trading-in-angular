import { Injectable } from '@angular/core';
import { Winloss } from '../models/winloss';
import { StockScore } from '../models/stock-score';

import * as _ from 'lodash';

@Injectable()
export class ScoreKeeperService {
  public profitLossHash = {};
  winlossHash = {};
  costEstimates = {};
  total = 0;

  constructor() { }

  addProfitLoss(stock: string, sum: number) {
    this.total += sum;

    if (this.profitLossHash[stock]) {
      this.profitLossHash[stock] += sum;
    } else {
      this.profitLossHash[stock] = sum;
    }

    this.profitLossHash[stock] = _.round(this.profitLossHash[stock], 2);
    this.addSell(stock, sum);
    console.log(`${stock}: ${this.profitLossHash[stock]}`);
  }

  updateCostEstimate(stock: string, price: number) {
    this.costEstimates[stock] = price;
  }

  addSell(stock: string, gains: number) {
    if (this.winlossHash[stock]) {
      if (gains > 0) {
        this.winlossHash[stock].wins++;
      } else {
        this.winlossHash[stock].losses++;
      }
      this.winlossHash[stock].total++;
    } else {
      const wl: Winloss = {
        wins: 0,
        losses: 0,
        total: 1
      };

      if (gains > 0) {
        wl.wins++;
      } else {
        wl.losses++;
      }

      this.winlossHash[stock] = wl;
    }
  }

  getScore(stock: string) {
    return this.winlossHash[stock];
  }
}

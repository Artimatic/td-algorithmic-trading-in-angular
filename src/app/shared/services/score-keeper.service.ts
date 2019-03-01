import { Injectable } from '@angular/core';
import { Winloss } from '../models/winloss';

import * as _ from 'lodash';
import { ReportingService } from './reporting.service';

@Injectable()
export class ScoreKeeperService {
  public profitLossHash = {};
  winlossHash = {};
  costEstimates = {};
  total = 0;

  constructor(private reportingService: ReportingService) { }

  addProfitLoss(stock: string, sum: number) {
    this.total += sum;

    if (this.profitLossHash[stock]) {
      this.profitLossHash[stock] += sum;
    } else {
      this.profitLossHash[stock] = sum;
    }

    this.profitLossHash[stock] = _.round(this.profitLossHash[stock], 2);
    this.addSell(stock, sum);
    const log = `${this.profitLossHash[stock]}`;
    console.log(stock, ': ', log);
    this.reportingService.addAuditLog(stock, log);
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

  resetScore(stock: string) {
   this.winlossHash[stock] = null;
  }
}

import { Injectable } from '@angular/core';
import { Winloss } from '../models/winloss';

import { ReportingService } from './reporting.service';

export interface ScoringIndex<TValue> {
  [id: string]: TValue;
}

interface WinLossIndex {
  [id: string]: Winloss;
}

@Injectable()
export class ScoreKeeperService {
  public profitLossHash: ScoringIndex<number> = {};
  winlossHash: WinLossIndex = {};
  costEstimates: ScoringIndex<number> = {};
  total = 0;
  lossTally: ScoringIndex<number> = {};
  percentReturns = {};
  bettingIndex = -1;
  constructor(private reportingService: ReportingService) { }

  resetTotal() {
    this.total = 0;
  }

  addProfitLoss(stock: string, sum: number) {
    sum = Number(sum);
    this.total += sum;
    console.log('Adding pl ', this.profitLossHash[stock], sum);
    if (this.profitLossHash[stock]) {
      this.profitLossHash[stock] = Number(this.profitLossHash[stock]) + sum;
    } else {
      this.profitLossHash[stock] = sum;
    }
    console.log('Final pl ', this.profitLossHash[stock]);

    this.addSell(stock, sum);
    const log = `${this.profitLossHash[stock].toFixed()}`;
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
        this.resetLossTally(stock);
      } else {
        this.winlossHash[stock].losses++;
        this.incrementLossTally(stock);
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
        this.resetLossTally(stock);
      } else {
        wl.losses++;
        this.incrementLossTally(stock);
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

  resetLossTally(stock: string) {
    this.lossTally[stock] = 0;
  }

  incrementLossTally(stock: string) {
    if (this.lossTally[stock]) {
      this.lossTally[stock]++;
    } else {
      this.lossTally[stock] = 1;
    }
  }

  resetProfitLoss(stock: string) {
    this.profitLossHash[stock] = 0;
  }

  addReturns(stock: string, returns: number) {
    this.percentReturns[stock] = returns;
  }
}

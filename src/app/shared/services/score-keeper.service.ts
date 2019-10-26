import { Injectable } from '@angular/core';
import { Winloss } from '../models/winloss';

import * as _ from 'lodash';
import { ReportingService } from './reporting.service';

interface ScoringIndex<TValue> {
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

  determineBetSize(stock: string, requestedQuantity: number, existingPositionSize: number,
    sizeLimit: number) {
    const modifier = _.add(this.determineLossTallyModifier(stock),
      this.determineExistingPositionModifier(existingPositionSize, sizeLimit));
    return _.round(_.multiply(modifier, requestedQuantity), 0);
  }

  determineLossTallyModifier(stock: string) {
    switch (this.lossTally[stock]) {
      case 1:
        return 0.50;
      case 2:
        return 0.85;
      case 3:
        return 0.65;
      case 4:
        return 0.5;
      case 5:
        return 0.3;
      default:
        return 0.10;
    }
  }

  determineExistingPositionModifier(existingPositionSize: number, sizeLimit: number): number {
    const ratio = _.divide(existingPositionSize, sizeLimit);
    if (ratio === 0) {
      return 0.1;
    } else if (ratio > 0 && ratio < 0.1) {
      return -0.25;
    } else if (ratio >= 0.1 && ratio < 0.4) {
      return -0.4;
    } else if (ratio >= 0.4 && ratio < 0.6) {
      return -0.7;
    } else if (ratio >= 0.6 && ratio < 0.8) {
      return -0.8;
    } else if (ratio >= 0.8) {
      return -0.9;
    }
  }
}

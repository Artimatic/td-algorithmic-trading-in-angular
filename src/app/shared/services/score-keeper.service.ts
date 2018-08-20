import { Injectable } from '@angular/core';
import { Trade } from '../models/trade';
import { StockScore } from '../models/stock-score';

@Injectable()
export class ScoreKeeperService {
  numTrades: number;
  numWins: number;
  numLosses: number;
  profitLoss: number;
  profitLossHash = {};
  trades: Trade[];

  constructor() { }

  addProfitLoss(stock: string, sum: number) {
    const score: StockScore = {stock: stock, profitLoss: sum};
    if (this.profitLossHash[stock]) {
      this.profitLossHash[stock] += sum;
    }

    this.profitLoss += sum;
  }

  getProfitLoss() {
    return this.profitLoss;
  }

  processTrade() {

  }
}

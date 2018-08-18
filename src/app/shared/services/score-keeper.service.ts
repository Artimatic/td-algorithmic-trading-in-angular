import { Injectable } from '@angular/core';
import { Trade } from '../models/trade';

@Injectable()
export class ScoreKeeperService {
  numTrades: number;
  numWins: number;
  numLosses: number;
  profitLoss: number;
  topTrade: Trade;
  worstTrade: Trade;
  trades: Trade[];

  constructor() { }

}

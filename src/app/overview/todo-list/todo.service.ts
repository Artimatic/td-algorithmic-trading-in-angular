import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  marketAnalysis: boolean;
  screenStocks: boolean;
  intradayBacktest: boolean;

  constructor() { }

  setMarketAnalysis() {
    this.marketAnalysis = true;
  }

  setScreenStocks() {
    this.screenStocks = true;
  }

  setIntradayBacktest() {
    this.intradayBacktest = true;
  }
}

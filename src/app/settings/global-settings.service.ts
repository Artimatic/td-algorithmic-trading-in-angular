import { Injectable } from '@angular/core';
import * as moment from 'moment-timezone';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum Brokerage {
  Robinhood = 'Robinhood',
  Td = 'TD Ameritrade'
}

@Injectable({
  providedIn: 'root'
})
export class GlobalSettingsService {
  startTime: Date;
  sellAtCloseTime: Date;
  stopTime: Date;
  maxLoss: number;
  brokerage: Brokerage;
  backtesting: boolean;
  backtestDate: string;
  deviation: number;
  fastAvg: number;
  slowAvg: number;
  selectedAlgo: string;
  tradeDate;
  daytradeAlgo: number[];
  daytradeAlgoSelection;
  featureList: number[][];
  autostart = false;

  constructor(private http: HttpClient) { }

  async globalModifier() {
    const spreadData = await this.get10y2ySpread().toPromise();
    const changePercent = Number(spreadData.QuickQuoteResult.QuickQuote.change_pct);
    if (changePercent < 0) {
      return 0.1;
    } else {
      return 1;
    }
  }

  get10y2ySpread(): Observable<any> {
    return this.http.get('/api/bonds/10y2yspread');
  }

  setStartTimes() {
    this.startTime = moment.tz(`${this.getTradeDate().format('YYYY-MM-DD')} 09:50`, 'America/New_York').toDate();
    this.sellAtCloseTime = moment.tz(`${this.getTradeDate().format('YYYY-MM-DD')} 15:40`, 'America/New_York').toDate();
    this.stopTime = moment.tz(`${this.getTradeDate().format('YYYY-MM-DD')} 15:50`, 'America/New_York').toDate();
  }

  getTradeDate() {
    return moment(this.tradeDate);
  }

  initTradeDate() {
    this.backtestDate = this.getLastTradeDate().format('YYYY-MM-DD');
  }

  getLastTradeDate() {
    const day = moment().tz('America/New_York').day();
    const time = moment().set({hour: 0, minute: 1});
    if (day === 6) {
      return time.subtract({ day: 1 });
    } else if (day === 0) {
      return time.subtract({ day: 2 });
    }
    return time;
  }

  getNextTradeDate() {
    const day = moment().tz('America/New_York').day();
    const time = moment().set({hour: 0, minute: 1});
    if (day === 6) {
      return time.add({ day: 2 });
    } else if (day === 0) {
      return time.add({ day: 1 });
    } else if (moment().isAfter(moment.tz('5:00pm', 'h:mma', 'America/New_York'))) {
      return time.add({ day: 1 });
    }
    return time;
  }

  initGlobalSettings() {
    this.setStartTimes();
    this.initTradeDate();

    this.maxLoss = 20;
    this.brokerage = Brokerage.Td;

    this.daytradeAlgo = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

    this.featureList = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0],
      [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
      [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1],
      [0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0]
    ];

    this.daytradeAlgoSelection = [];

    this.featureList.forEach((value) => {
      this.daytradeAlgoSelection.push({ label: value.join(''), value });
    });
  }
}

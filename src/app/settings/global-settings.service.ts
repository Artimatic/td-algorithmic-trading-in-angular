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
  constructor(private http: HttpClient) {
    this.startTime = moment.tz('10:00am', 'h:mma', 'America/New_York').toDate();
    this.sellAtCloseTime = moment.tz('3:40pm', 'h:mma', 'America/New_York').toDate();
    this.stopTime = moment.tz('3:50pm', 'h:mma', 'America/New_York').toDate();
    this.maxLoss = 50;
    this.brokerage = Brokerage.Td;
    this.backtestDate = moment().format('YYYY-MM-DD');
  }

  async globalModifier() {
    const spreadData = await this.get10y2ySpread().toPromise();
    const changePercent = Number(spreadData.QuickQuoteResult.QuickQuote.change_pct);
    if (changePercent < 0) {
      return 0.5;
    } else {
      return 1;
    }
  }

  get10y2ySpread(): Observable<any> {
    return this.http.get('/api/bonds/10y2yspread');
  }
}

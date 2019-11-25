import { Injectable } from '@angular/core';
import * as moment from 'moment-timezone';

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
  deviation: number;
  fastAvg: number;
  slowAvg: number;
  selectedAlgo: string;
  constructor() {
    this.startTime = moment.tz('10:00am', 'h:mma', 'America/New_York').toDate();
    this.sellAtCloseTime = moment.tz('3:40pm', 'h:mma', 'America/New_York').toDate();
    this.stopTime = moment.tz('3:50pm', 'h:mma', 'America/New_York').toDate();
    this.maxLoss = 50;
    this.brokerage = Brokerage.Robinhood;
  }
}

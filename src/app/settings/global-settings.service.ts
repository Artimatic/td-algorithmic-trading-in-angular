import { Injectable } from '@angular/core';
import * as moment from 'moment-timezone';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, Subscription } from 'rxjs';
import { TimerObservable } from 'rxjs-compat/observable/TimerObservable';

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
  maxAccountUsage = 1;

  timer: Subscription;
  timerInterval = 70800;
  defaultInterval = 70800;
  tradeDayStart: Subject<boolean> = new Subject();
  lastStartDate = null;

  constructor(private http: HttpClient) { }

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

  setStartTimes(nextTradeDay = false) {
    let beginTime = '09:50';
    let endTime = '15:50';
    let sellTime = '15:30';
    let startDate = null;
    if (this.startTime) {
      beginTime = moment.tz(this.startTime.valueOf(), 'America/New_York').format('HH:mm');
    }

    if (this.tradeDate && !nextTradeDay) {
      startDate = moment.tz(this.tradeDate.valueOf(), 'America/New_York');
    } else {
      startDate = this.getTradeDate();
    }

    if (this.stopTime) {
      endTime = moment.tz(this.stopTime.valueOf(), 'America/New_York').format('HH:mm');
    }

    if (this.sellAtCloseTime) {
      sellTime = moment.tz(this.sellAtCloseTime.valueOf(), 'America/New_York').format('HH:mm');
    }
    this.startTime = moment.tz(`${startDate.format('YYYY-MM-DD')} ${beginTime}`, 'America/New_York').toDate();
    this.sellAtCloseTime = moment.tz(`${startDate.format('YYYY-MM-DD')} ${sellTime}`, 'America/New_York').toDate();
    this.stopTime = moment.tz(`${startDate.format('YYYY-MM-DD')} ${endTime}`, 'America/New_York').toDate();
  }

  getTradeDate() {
    if (!this.tradeDate || (this.tradeDate && moment().diff(this.tradeDate, 'days') > 0)) {
      this.tradeDate = this.getNextTradeDate();
    }
    return this.tradeDate;
  }

  initBacktestDate() {
    this.backtestDate = this.getLastTradeDate().format('YYYY-MM-DD');
  }

  getStartStopTime() {
    const endTime = '16:00';
    const currentMoment = moment().tz('America/New_York').set({ hour: 9, minute: 40 });
    const currentEndMoment = moment().tz('America/New_York').set({ hour: 16, minute: 0 });
    const currentDay = currentMoment.day();
    let startDate;

    if (currentDay === 6) {
      startDate = currentMoment.add({ day: 2 });
    } else if (currentDay === 0) {
      startDate = currentMoment.add({ day: 1 });
    } else {
      if (moment().isAfter(currentMoment) && moment().isBefore(currentEndMoment)) {
        startDate = currentMoment;
      } else {
        startDate = moment().tz('America/New_York').set({ hour: 9, minute: 50 }).add(1, 'days');
      }
    }

    const startDateTime = moment.tz(startDate.format(), 'America/New_York').toDate();
    const endDateTime = moment.tz(`${startDate.format('YYYY-MM-DD')} ${endTime}`, 'America/New_York').toDate();
    return {
      startDateTime,
      endDateTime
    };
  }

  getLastTradeDate() {
    const currentMoment = moment().tz('America/New_York').set({ hour: 9, minute: 50 });
    const currentDay = currentMoment.day();
    let lastTradeDate;

    if (currentDay === 6) {
      lastTradeDate = currentMoment.subtract({ day: 1 });
    } else if (currentDay === 7) {
      lastTradeDate = currentMoment.subtract({ day: 2 });
    } else if (currentDay === 0) {
      lastTradeDate = currentMoment.subtract({ day: 2 });
    } else if (currentDay === 1) {
      lastTradeDate = currentMoment.subtract({ day: 3 });
    } else {
      lastTradeDate = currentMoment.add({ day: 1 });
    }

    return moment.tz(lastTradeDate.format(), 'America/New_York');
  }

  getNextTradeDate() {
    const day = moment().tz('America/New_York').day();
    const time = moment().tz('America/New_York').set({ hour: 0, minute: 1 });

    if (day === 6) {
      return time.add({ day: 2 });
    } else if (day === 0) {
      return time.add({ day: 1 });
    } else if (moment().tz('America/New_York').isAfter(moment.tz('04:00pm', 'h:mma', 'America/New_York'))) {
      return time.add({ day: 1 });
    }
    return time;
  }

  setAutoStart(newAutostart = null) {
    this.autostart = newAutostart === null ? !this.autostart : newAutostart;
    this.setStartTimes(newAutostart);
    console.log('starttime ', this.startTime, this.stopTime, this.sellAtCloseTime);
  }

  initGlobalSettings() {
    this.setStartTimes();
    this.initBacktestDate();

    this.maxLoss = 500;
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

    if (this.timer) {
      this.timer.unsubscribe();
    }

    this.timer = TimerObservable.create(0, this.timerInterval)
      .subscribe(() => {
        if (this.timerInterval !== this.defaultInterval) {
          this.timerInterval = this.defaultInterval;
        }

        if (moment().isAfter(moment(this.startTime)) &&
          moment().isBefore(moment(this.stopTime)) &&
          this.lastStartDate !== moment().format('YYYY-MM-DD')) {
          this.tradeDayStart.next(true);
          this.lastStartDate = moment().format('YYYY-MM-DD');
          console.log('Global start at ', moment().format());
        } else if (moment().isAfter(moment(this.stopTime)) &&
          moment().isBefore(moment(this.stopTime).add(2, 'minutes'))) {
          this.setStartTimes();
          this.tradeDayStart.next(false);
          console.log('Global stop at ', moment().format());
        } else {
          this.timerInterval = moment().subtract(5, 'minutes').diff(moment(this.startTime), 'milliseconds');
          if (this.timerInterval < 0) {
            this.timerInterval = this.defaultInterval;
          }
        }
      });
  }
}

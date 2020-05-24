import { Injectable, OnDestroy } from '@angular/core';
import { Subscription, Subject, Observable } from 'rxjs';
import * as moment from 'moment-timezone';
import { BacktestService } from './backtest.service';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GlobalTaskQueueService implements OnDestroy {
  private callChainSub: Subscription = new Subscription();
  private buffer: {
    sub: Observable<any>,
    cb: Function,
    errorHandler: Function
  }[] = [];
  private bufferSubject: Subject<void> = new Subject();
  constructor(private backtestService: BacktestService) { }

  startTasks() {
    this.bufferSubject.subscribe(() => {
      const buffer = this.buffer[0];
      this.callChainSub.add(buffer.sub
        .pipe(take(1))
        .subscribe((result) => {
        buffer.cb(result);
        this.buffer.shift();
        this.triggerNext();
      }, error => {
        buffer.errorHandler(error);
        this.buffer.shift();
        this.triggerNext();
      }));
    });
  }

  addTask(sub: Observable<any>, callback: Function, errorHandler: Function) {
    this.buffer.push({
      sub,
      cb: callback,
      errorHandler
    });

    this.afterTaskAdded();
  }

  activateMl(stock: string, callback: Function, errorHandler: Function) {
    this.buffer.push({
      sub: this.backtestService.activateLstmV2(stock),
      cb: callback,
      errorHandler
    });

    this.afterTaskAdded();
  }

  activateMl2(stock: string, featuresList = '0,0,1,0,0,1,1,1,1,1,1,0,0', callback: Function, errorHandler: Function) {
    this.buffer.push({
      sub: this.backtestService.activateLstmV3(stock, featuresList),
      cb: callback,
      errorHandler
    });

    this.afterTaskAdded();
  }

  trainMl2(stock: string,
    startDate = moment().format('YYYY-MM-DD'),
    endDate = moment().subtract({ day: 365 }).format('YYYY-MM-DD'),
    trainingSize = 0.7,
    featuresList = '0,0,1,0,0,1,1,1,1,1,1,0,0',
    callback: Function,
    errorHandler: Function) {
    this.buffer.push({
      sub: this.backtestService.runLstmV3(stock.toUpperCase(), startDate, endDate, trainingSize, featuresList),
      cb: callback,
      errorHandler
    });

    this.afterTaskAdded();
  }

  afterTaskAdded() {
    if (this.buffer.length === 1) {
      this.triggerNext();
    }
  }

  triggerNext() {
    if (this.buffer.length > 0) {
      this.bufferSubject.next();
    }
  }

  ngOnDestroy() {
    this.callChainSub.unsubscribe();
  }
}

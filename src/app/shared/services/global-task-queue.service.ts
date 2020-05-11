import { Injectable } from '@angular/core';
import { Subscription, Subject, Observable } from 'rxjs';
import { BacktestService } from './backtest.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalTaskQueueService {

  private callChainSub: Subscription;
  private buffer: {
    sub: Observable<any>,
    cb: () => {},
    errorHandler: () => {}
  }[];
  private bufferSubject: Subject<void>;
  private executing = false;
  constructor(private backtestService: BacktestService) { }

  addTask(taskName: string, callback: () => {}) {

  }

  activateMl(stock: string, callback: () => {}, errorHandler: () => {}) {
    this.buffer.push({
      sub: this.backtestService.activateLstmV2(stock),
      cb: callback,
      errorHandler
    });

    this.afterTaskAdded();
  }

  activateMl2(stock: string, featuresList: string, callback: () => {}, errorHandler: () => {}) {
    this.buffer.push({
      sub: this.backtestService.activateLstmV3(stock, featuresList),
      cb: callback,
      errorHandler
    });

    this.afterTaskAdded();
  }

  afterTaskAdded() {
    if (!this.executing) {
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

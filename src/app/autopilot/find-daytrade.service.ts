import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface StockTrade {
  stock: string;
  recommendations?: string;
  time?: string;
  orderQuantity?: number
}

@Injectable({
  providedIn: 'root'
})
export class FindDaytradeService {
  tradeObserver: Subject<StockTrade> = new Subject<StockTrade>();
  refreshObserver: Subject<boolean> = new Subject<boolean>();
  
  tradeList = [];
  constructor() { }

  addTrade(trade) {
    this.tradeObserver.next(trade);
  }

  getTradeObserver() {
    return this.tradeObserver;
  }

  getRefreshObserver() {
    return this.refreshObserver;
  }
}

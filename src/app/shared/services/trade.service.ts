import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AlgoQueueItem  {
  symbol: string;
  id?: string;
  reset: boolean;
  updateOrder?: boolean;
  triggerMlBuySell?: boolean;
}

@Injectable()
export class TradeService {
  algoQueue: Subject<AlgoQueueItem> = new Subject();

  constructor() { }

}

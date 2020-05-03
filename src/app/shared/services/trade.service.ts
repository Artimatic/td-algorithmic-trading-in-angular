import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AlgoQueueItem  {
  symbol: string;
  reset: boolean;
  updateOrder?: boolean;
}

@Injectable()
export class TradeService {
  algoQueue = new Subject();

  constructor() { }

}

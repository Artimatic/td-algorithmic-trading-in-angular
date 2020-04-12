import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AlgoQueueItem  {
  symbol: string;
  reset: boolean;
}

@Injectable()
export class TradeService {
  algoQueue = new Subject();

  constructor() { }

}

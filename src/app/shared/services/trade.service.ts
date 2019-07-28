import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class TradeService {
  algoQueue = new Subject();

  constructor() { }

}

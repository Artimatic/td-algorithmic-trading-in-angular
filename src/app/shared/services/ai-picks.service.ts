import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiPicksService {
  tickerBuyRecommendationQueue: Subject<string> = new Subject();
  tickerSellRecommendationQueue: Subject<string> = new Subject();
  clearLists: Subject<boolean> = new Subject();

  constructor() { }
}

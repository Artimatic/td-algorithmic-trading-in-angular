import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AiPicksPredictionData {
  algorithm: number;
  prediction: number;
  accuracy: number;
}

export interface AiPicksData {
  label: string;
  value: AiPicksPredictionData[];
}

@Injectable({
  providedIn: 'root'
})
export class AiPicksService {
  tickerBuyRecommendationQueue: Subject<string> = new Subject();
  tickerSellRecommendationQueue: Subject<string> = new Subject();
  mlBuyResults: Subject<AiPicksData> = new Subject();
  mlSellResults: Subject<AiPicksData> = new Subject();

  clearLists: Subject<boolean> = new Subject();
  private buyList: AiPicksData[] = [];
  private sellList: AiPicksData[] = [];

  constructor() { }

  getBuyList() {
    return this.buyList;
  }

  addBuy(recommendation: AiPicksData) {
    this.buyList.push(recommendation);
  }

  clearBuyList() {
    this.buyList = [];
  }

  getSellList() {
    return this.sellList;
  }

  addSell(recommendation: AiPicksData) {
    this.sellList.push(recommendation);
  }

  clearSellList() {
    this.sellList = [];
  }
}

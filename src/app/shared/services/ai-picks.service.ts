import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AiPicksPredictionData {
  algorithm: number;
  prediction: number;
  accuracy: number;
  date?: string;
  stock?: string;
  predictionHistory?: AiPicksPredictionDate[];
}

export interface AiPicksPredictionDate {
  date: string;
  prediction: number;
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
  mlNeutralResults: Subject<AiPicksData> = new Subject();
  predictionData: Subject<AiPicksPredictionData> = new Subject();

  clearLists: Subject<boolean> = new Subject();
  constructor() { }
}

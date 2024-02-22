import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import * as moment from 'moment-timezone';
import { round } from 'lodash';
import { GlobalSettingsService } from 'src/app/settings/global-settings.service';
import { MachineLearningService } from './machine-learning/machine-learning.service';

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
  constructor(private globalSettingsService: GlobalSettingsService,
    private machineLearningService: MachineLearningService) { }

  async trainAndActivate(symbol, range = 10, limit = 0.01) {
    const endDate = this.globalSettingsService.getLastTradeDate().format('YYYY-MM-DD');
    const startDate = moment(endDate).subtract({ day: 150 }).format('YYYY-MM-DD');
    try {
      await this.machineLearningService.trainPredictDailyV4(symbol,
        endDate,
        startDate,
        0.9,
        null,
        range,
        limit
      ).toPromise();
      try {

      const activation = await this.machineLearningService.activateDailyV4(symbol,
        null,
        range,
        limit).toPromise();
        const prediction = { algorithm: range, prediction: (activation as any).nextOutput };
        return { label: symbol, value: [prediction] };
      } catch(error) {
        console.log(error);
      }
    } catch(error) {
      console.log('error: ', error);
    }
    return null;
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { MachineLearningService } from '@shared/index';
import { AiPicksService } from '@shared/services';
import * as moment from 'moment';

interface AiPicksPredictionData {
  algorithm: number;
  prediction: number;
}

interface AiPicksData {
  label: string;
  value: AiPicksPredictionData[];
}

@Component({
  selector: 'app-ai-picks',
  templateUrl: './ai-picks.component.html',
  styleUrls: ['./ai-picks.component.css']
})
export class AiPicksComponent implements OnInit, OnDestroy {
  buys: AiPicksData[] = [];
  sells: AiPicksData[] = [];

  buysLimit = 3;
  sellsLimit = 3;
  isLoading = false;

  constructor(private aiPicksService: AiPicksService,
    private machineLearningService: MachineLearningService
  ) { }

  ngOnInit() {
    this.aiPicksService.tickerBuyRecommendationQueue.subscribe(stock => {
      this.getPredictions(stock, true);
    });

    this.aiPicksService.tickerSellRecommendationQueue.subscribe(stock => {
      this.getPredictions(stock, false);
    });
  }

  getPredictions(stock, isBuy) {
    const SixtyDayPrediction = () => this.activate(stock, 60, 0.01, isBuy, () => { });
    const ThirtyDayPrediction = () => this.activate(stock, 30, 0.01, isBuy, SixtyDayPrediction);
    const FifteenDayPrediction = () => this.activate(stock, 15, 0.01, isBuy, ThirtyDayPrediction);
    const FiveDayPrediction = () => this.activate(stock, 5, 0.01, isBuy, FifteenDayPrediction);

    FiveDayPrediction();
  }

  activate(symbol: string, range, limit, isBuy: boolean, cb: () => void) {
    this.isLoading = true;
    this.machineLearningService.activateDailyV4(symbol,
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      range,
      limit)
      .subscribe((activation) => {
        if (!activation) {
          setTimeout(() => {
            this.trainAndActivate(symbol, range, limit, isBuy, cb);
          }, 1000);
        } else {
          const prediction = { algorithm: range, prediction: activation.nextOutput };
          if (isBuy) {
            this.addBuyPick(symbol, prediction);
          } else {
            this.addSellPick(symbol, prediction);
          }
          setTimeout(() => {
            cb();
          }, 1000);
        }
        this.isLoading = false;
      }, error => {
        console.log('error: ', error);
        this.isLoading = false;
      });
  }

  trainAndActivate(symbol, range, limit, isBuy, cb: () => void) {
    this.isLoading = true;

    this.machineLearningService.trainPredictDailyV4(symbol,
      moment().subtract({ day: 1 }).format('YYYY-MM-DD'),
      moment().subtract({ day: 365 }).format('YYYY-MM-DD'),
      0.7,
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      range,
      limit
    )
      .subscribe((data) => {
        this.activate(symbol, range, limit, isBuy, cb);
        console.log('training results: ', data);
        this.isLoading = false;
      }, error => {
        console.log('error: ', error);
        this.isLoading = false;
      });
  }


  addSellPick(symbol: string, predictionData: AiPicksPredictionData) {
    const isSellPick = (element: AiPicksData) => element.label === symbol;

    const index = this.sells.findIndex(isSellPick);
    if (index >= 0) {
      this.sells[index].value.push(predictionData);
    } else {
      const sellItem = this.createListObject(symbol, predictionData)
      this.sells.push(sellItem);
    }
  }

  addBuyPick(symbol: string, predictionData: AiPicksPredictionData) {
    const isBuyPick = (element: AiPicksData) => element.label === symbol;

    const index = this.sells.findIndex(isBuyPick);
    if (index >= 0) {
      this.buys[index].value.push(predictionData);
    } else {
      const item = this.createListObject(symbol, predictionData)
      this.buys.push(item);
    }
  }

  createListObject(symbol: string, predictionData: AiPicksPredictionData): AiPicksData {
    return { label: symbol, value: [predictionData] };
  }

  ngOnDestroy() {
    this.aiPicksService.tickerBuyRecommendationQueue.unsubscribe();
    this.aiPicksService.tickerSellRecommendationQueue.unsubscribe();
  }
}

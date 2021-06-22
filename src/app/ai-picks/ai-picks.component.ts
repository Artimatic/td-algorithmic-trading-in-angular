import { Component, OnDestroy, OnInit } from '@angular/core';
import { MachineLearningService } from '@shared/index';
import { AiPicksService } from '@shared/services';
import * as moment from 'moment';

interface AiPicksPredictionData {
  algorithm: number;
  prediction: number;
  accuracy: number;
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
  counter = 0;

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

    this.aiPicksService.clearLists.subscribe(() => {
      this.buys = [];
      this.sells = [];
    });
  }

  getPredictions(stock, isBuy) {
    const ThirtyDayPrediction = () => this.activate(stock, 30, 0.01, isBuy, null, () => { });
    const FifteenDayPrediction = () => this.activate(stock, 15, 0.01, isBuy, null, ThirtyDayPrediction);
    const FiveDayPrediction = () => this.activate(stock, 5, 0.01, isBuy, null, FifteenDayPrediction);

    FiveDayPrediction();
  }

  activate(symbol: string, range, limit, isBuy: boolean, accuracy: number = null, cb: () => void) {
    this.isLoading = true;
    this.counter++;
    this.machineLearningService.activateDailyV4(symbol,
      null,
      range,
      limit)
      .subscribe((activation) => {
        this.counter--;
        let delay = 0;
        if (this.counter > 0) {
          delay = 2000 + 2000 * this.counter;
        }
        if (!activation) {
          setTimeout(() => {
            this.trainAndActivate(symbol, range, limit, isBuy, cb);
          }, delay);
        } else {
          const prediction = { algorithm: range, prediction: activation.nextOutput, accuracy: accuracy };
          if (isBuy) {
            this.addBuyPick(symbol, prediction);
          } else {
            this.addSellPick(symbol, prediction);
          }
          setTimeout(() => {
            cb();
          }, delay);

        }
        this.isLoading = false;
      }, error => {
        this.counter--;
        console.log('error: ', error);
        this.isLoading = false;
      });
  }

  trainAndActivate(symbol, range, limit, isBuy, cb: () => void) {
    this.isLoading = true;
    this.counter++;

    this.machineLearningService.trainPredictDailyV4(symbol,
      moment().subtract({ day: 1 }).format('YYYY-MM-DD'),
      moment().subtract({ day: 365 }).format('YYYY-MM-DD'),
      0.7,
      null,
      range,
      limit
    )
      .subscribe((data) => {
        this.counter--;
        let delay = 0;
        if (this.counter > 0) {
          delay = 2000 + 1000 * this.counter;
        }
        setTimeout(() => {
          this.activate(symbol, range, limit, isBuy, data.score, cb);
        }, delay);
        this.isLoading = false;
      }, error => {
        this.counter--;

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
      const sellItem = this.createListObject(symbol, predictionData);
      this.sells.push(sellItem);
    }
  }

  addBuyPick(symbol: string, predictionData: AiPicksPredictionData) {
    const isBuyPick = (element: AiPicksData) => element.label === symbol;

    const index = this.buys.findIndex(isBuyPick);
    if (index >= 0) {
      this.buys[index].value.push(predictionData);
    } else {
      const item = this.createListObject(symbol, predictionData);
      this.buys.push(item);
    }
  }

  createListObject(symbol: string, predictionData: AiPicksPredictionData): AiPicksData {
    return { label: symbol, value: [predictionData] };
  }

  removeFromBuyList(name) {
    const idx = this.buys.findIndex(element => element.label === name);
    this.buys.splice(idx, 1);
  }

  removeFromSellList(name) {
    const idx = this.sells.findIndex(element => element.label === name);
    this.sells.splice(idx, 1);
  }


  ngOnDestroy() {
    this.aiPicksService.tickerBuyRecommendationQueue.unsubscribe();
    this.aiPicksService.tickerSellRecommendationQueue.unsubscribe();
    this.aiPicksService.clearLists.unsubscribe();
  }
}

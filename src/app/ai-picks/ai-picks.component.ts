import { Component, OnDestroy, OnInit } from '@angular/core';
import { MachineLearningService } from '@shared/index';
import { AiPicksService } from '@shared/services';
import * as moment from 'moment';

@Component({
  selector: 'app-ai-picks',
  templateUrl: './ai-picks.component.html',
  styleUrls: ['./ai-picks.component.css']
})
export class AiPicksComponent implements OnInit, OnDestroy {
  buys = [
  ];

  sells = [
  ];

  buysLimit = 3;
  sellsLimit = 3;

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
    const SixtyDayPrediction = () => this.activate(stock, 60, 0.01, isBuy, () => {});
    const ThirtyDayPrediction = () => this.activate(stock, 30, 0.01, isBuy, SixtyDayPrediction);
    const FifteenDayPrediction = () => this.activate(stock, 15, 0.01, isBuy, ThirtyDayPrediction);
    const FiveDayPrediction = () => this.activate(stock, 5, 0.01, isBuy, FifteenDayPrediction);

    FiveDayPrediction();
  }

  activate(symbol: string, range, limit, isBuy: boolean, cb: () => void) {
    this.machineLearningService.activateDailyV4(symbol,
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      range,
      limit)
      .subscribe((activation) => {
        if (!activation)) {
          this.trainAndActivate(symbol, range, limit, isBuy, cb);
        } else {
          const data = {
            nextOutput: activation.nextOutput,
            day: range,
            symbol
          };
          if (isBuy) {
            this.buys.push(this.createListObject(data));
          } else {
            this.sells.push(this.createListObject(data));
          }
          cb();
        }
      }, error => {
        console.log('error: ', error);
      });
  }

  trainAndActivate(symbol, range, limit, isBuy, cb: () => void) {
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
      }, error => {
        console.log('error: ', error);
      });
  }

  createListObject(data) {
    return { label: data.symbol, value: { algorithm: data.day, prediction: data.nextOutput } };
  }

  ngOnDestroy() {
    this.aiPicksService.tickerBuyRecommendationQueue.unsubscribe();
    this.aiPicksService.tickerSellRecommendationQueue.unsubscribe();
  }
}

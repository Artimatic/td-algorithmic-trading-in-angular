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
      if (this.buys.length < this.buysLimit) {
        this.activate(stock, 2, 0.01, true);
      } else {
        this.aiPicksService.tickerBuyRecommendationQueue.unsubscribe();
      }
    });

    this.aiPicksService.tickerSellRecommendationQueue.subscribe(stock => {
      if (this.sells.length < this.sellsLimit) {
        this.activate(stock, 2, 0.01, false);
      } else {
        this.aiPicksService.tickerSellRecommendationQueue.unsubscribe();
      }
    });
  }

  activate(symbol: string, range, limit, isBuy: boolean) {
    this.machineLearningService.activateDailyV4(symbol,
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      range,
      limit)
      .subscribe((activation) => {
        if (!activation || !activation.nextOutput) {
          this.trainAndActivate(symbol, range, limit, isBuy);
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
        }
      }, error => {
        console.log('error: ', error);
      });
  }

  trainAndActivate(symbol, range, limit, isBuy) {
    this.machineLearningService.trainPredictDailyV4(symbol,
      moment().subtract({ day: 1 }).format('YYYY-MM-DD'),
      moment().subtract({ day: 365 }).format('YYYY-MM-DD'),
      0.7,
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      range,
      limit
    )
      .subscribe((data) => {
        this.activate(symbol, range, limit, isBuy);
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

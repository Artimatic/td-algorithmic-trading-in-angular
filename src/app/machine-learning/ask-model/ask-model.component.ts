import { Component, OnInit, OnDestroy } from '@angular/core';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material';
import { FormGroup, FormBuilder } from '@angular/forms';
import { BacktestService, MachineLearningService } from '../../shared/index';
import IntradayStocks from '../../intraday-backtest-view/intraday-backtest-stocks.constant';
import { Subscription, Subject } from 'rxjs';

export interface TrainingResults {
  algorithm?: string;
  guesses: number;
  correct: number;
  score: number;
  nextOutput: number;
}

@Component({
  selector: 'app-ask-model',
  templateUrl: './ask-model.component.html',
  styleUrls: ['./ask-model.component.css']
})
export class AskModelComponent implements OnInit, OnDestroy {
  public startDate: Date;
  public endDate: Date;
  form: FormGroup;
  symbol = 'SPY';
  isLoading: boolean;
  selectedModel: any;
  models: any[];
  cols: any[];
  modelResults: TrainingResults[];
  private callChainSub: Subscription;
  private backtestBuffer: { stock: string }[];
  private bufferSubject: Subject<void>;

  constructor(
    private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private machineLearningService: MachineLearningService,
    public snackBar: MatSnackBar) { }

  ngOnInit() {
    this.bufferSubject = new Subject();
    this.backtestBuffer = [];
    this.callChainSub = new Subscription();

    this.endDate = new Date();

    this.form = this._formBuilder.group({
      query: this.symbol
    });

    this.models = [
      { name: 'Open Price Up', code: 'open_price_up' },
      { name: 'Predict Next 30 minutes', code: 'predict_30' }
    ];

    this.cols = [
      { field: 'symbol', header: 'Stock' },
      { field: 'algorithm', header: 'Algorithm' },
      { field: 'guesses', header: 'Guesses' },
      { field: 'correct', header: 'Correct' },
      { field: 'score', header: 'Score' },
      { field: 'nextOutput', header: 'Next Output' }
    ];

    this.modelResults = [];
    this.isLoading = false;
    this.setStartDate();
    this.selectedModel = this.models[1];
  }

  setStartDate() {
    const start = moment(this.endDate).subtract({ day: 1 });
    const day = start.day();
    if (day === 6) {
      this.startDate = start.subtract({ day: 1 }).toDate();
    } else if (day === 7) {
      this.startDate = start.subtract({ day: 1 }).toDate();
    } else if (day === 0) {
      this.startDate = start.subtract({ day: 2 }).toDate();
    } else {
      this.startDate = start.toDate();
    }
    console.log('start date: ', this.startDate);
  }

  train() {
    this.setStartDate();
    switch (this.selectedModel.code) {
      case 'open_price_up': {
        this.trainOpenUp();
        break;
      }
      case 'predict_30': {
        this.trainPredict30();
        break;
      }
    }
  }

  activate() {
    this.setStartDate();

    switch (this.selectedModel.code) {
      case 'open_price_up': {
        this.activateOpenUp();
        break;
      }
    }
  }

  trainOpenUp() {
    this.isLoading = true;
    this.backtestService
      .runLstmV2(this.form.value.query,
        moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD'),
        moment(this.startDate).format('YYYY-MM-DD')
      ).subscribe((data: TrainingResults[]) => {
        this.isLoading = false;
        data[0].algorithm = 'Open Price Up';
        this.modelResults.push(data[0]);
      }, error => {
        console.log('error: ', error);
        this.isLoading = false;
      });
  }

  activateOpenUp() {
    this.isLoading = true;

    this.backtestService.activateLstmV2(this.form.value.query)
      .subscribe((data) => {
        this.isLoading = false;
        data[0].algorithm = 'Open Price Up';
        this.modelResults.push(data[0]);
      }, error => {
        console.log('error: ', error);
        this.isLoading = false;
      });
  }

  trainPredict30() {
    this.isLoading = true;
    this.machineLearningService
      .trainPredictNext30(this.form.value.query,
        moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD'),
        moment(this.startDate).format('YYYY-MM-DD'),
        1
      ).subscribe((data: TrainingResults[]) => {
        this.isLoading = false;
        this.addTableItem(data);
      }, error => {
        console.log('error: ', error);
        this.isLoading = false;
      });
  }

  score() {
    this.setStartDate();

    this.isLoading = true;
    this.machineLearningService
      .trainPredictNext30(this.form.value.query,
        moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD'),
        moment(this.startDate).format('YYYY-MM-DD'),
        0
      ).subscribe((data: TrainingResults[]) => {
        this.isLoading = false;
        this.addTableItem(data);
      }, error => {
        console.log('error: ', error);
        this.isLoading = false;
      });
  }

  addTableItem(item: TrainingResults[]) {
    this.modelResults = this.modelResults.concat(item);
  }

  importRandom() {
    const stockList = [];
    const uniqueCheck = {};
    for (let i = 0; i < 25; i++) {
      let rand;
      do {
        rand = Math.floor(Math.random() * IntradayStocks.length);
      } while (uniqueCheck[rand]);
      stockList.push(IntradayStocks[rand]);
      uniqueCheck[rand] = true;
    }
    return stockList;
  }

  random() {
    this.setStartDate();

    const stocks = this.importRandom();
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      this.backtestBuffer.push({ stock: stock.symbol });
    }

    this.executeBacktests();
  }

  executeBacktests() {
    this.bufferSubject.subscribe(() => {
      const backtest = this.backtestBuffer.pop();
      this.callChainSub.add(this.machineLearningService
        .trainPredictNext30(backtest.stock,
          moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD'),
          moment(this.startDate).format('YYYY-MM-DD'),
          1
        ).subscribe((data: TrainingResults[]) => {
          this.isLoading = false;
          this.addTableItem(data);
          this.triggerNextBacktest();
        }, error => {
          console.log('model error: ', error);
          this.isLoading = false;
          setTimeout(() => {
            this.machineLearningService
            .trainPredictNext30(backtest.stock,
              moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD'),
              moment(this.startDate).format('YYYY-MM-DD'),
              0
            ).subscribe((data: TrainingResults[]) => {
              this.isLoading = false;
              this.addTableItem(data);
              this.triggerNextBacktest();
            }, error => {
              console.log('error: ', error);
              this.isLoading = false;
              this.triggerNextBacktest();
            });

          }, 200000);

        }));
    });

    this.triggerNextBacktest();
  }


  triggerNextBacktest() {
    if (this.backtestBuffer.length > 0) {
      this.bufferSubject.next();
    }
  }

  ngOnDestroy() {
    this.callChainSub.unsubscribe();
  }
}

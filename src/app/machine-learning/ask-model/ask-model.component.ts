import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material';
import { FormGroup, FormBuilder } from '@angular/forms';
import { BacktestService, MachineLearningService } from '../../shared/index';
import IntradayStocks from '../../intraday-backtest-view/intraday-backtest-stocks.constant';

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
export class AskModelComponent implements OnInit {
  public startDate: Date;
  public endDate: Date;
  form: FormGroup;
  symbol = 'SPY';
  isLoading: boolean;
  selectedModel: any;
  models: any[];
  cols: any[];
  modelResults: TrainingResults[];

  constructor(
    private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private machineLearningService: MachineLearningService,
    public snackBar: MatSnackBar) { }

  ngOnInit() {
    this.endDate = new Date();
    const start = moment().subtract({ day: 2 });
    const day = start.day();
    if (day === 0 || day === 6) {
      this.startDate = moment().subtract({ day: 3 }).toDate();
    } else {
      this.startDate = start.toDate();
    }

    this.form = this._formBuilder.group({
      query: this.symbol
    });

    this.models = [
      { name: 'Open Price Up', code: 'open_price_up' },
      { name: 'Predict Next 30 minutes', code: 'predict_30' }
    ];

    this.cols = [
      { field: 'algorithm', header: 'Algorithm' },
      { field: 'guesses', header: 'Guesses' },
      { field: 'correct', header: 'Correct' },
      { field: 'score', header: 'Score' },
      { field: 'nextOutput', header: 'Next Output' }
    ];

    this.modelResults = [];
    this.isLoading = false;
  }

  train() {
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
        moment(this.endDate).format('YYYY-MM-DD'),
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
        moment(this.endDate).format('YYYY-MM-DD'),
        moment(this.startDate).format('YYYY-MM-DD')
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
    const stocks = this.importRandom();
    for (const stock of stocks) {
      setTimeout(() => {
        this.machineLearningService
          .trainPredictNext30(stock.symbol,
            moment(this.endDate).format('YYYY-MM-DD'),
            moment(this.startDate).format('YYYY-MM-DD')
          ).subscribe((data: TrainingResults[]) => {
            this.isLoading = false;
            this.addTableItem(data);
          }, error => {
            console.log('error: ', error);
            this.isLoading = false;
          });
      }, 18000);
    }
  }

}

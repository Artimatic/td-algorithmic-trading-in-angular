import { Component, OnInit } from '@angular/core';
import { BacktestService } from '@shared/services';
import * as moment from 'moment-timezone';

@Component({
  selector: 'app-ml-timeperiods',
  templateUrl: './ml-timeperiods.component.html',
  styleUrls: ['./ml-timeperiods.component.css']
})
export class MlTimeperiodsComponent implements OnInit {
  backtest = [];
  constructor(private backtestService: BacktestService) { }

  ngOnInit() {
  }

  init() {
    this.train().subscribe((training) => {
      console.log('initial training: ', training);
      this.testModel().subscribe((data) => {
        console.log('test model ', data);
      });
    });
  }

  train() {
    return this.backtestService.runLstmV2('SPY',
      moment().subtract({ day: 100 }).format('YYYY-MM-DD'),
      moment().subtract({ day:  300}).format('YYYY-MM-DD'),
      0.9);
  }

  testModel() {
    return this.backtestService.runLstmV2('SPY',
      moment().subtract({ day: 1 }).format('YYYY-MM-DD'),
      moment().subtract({ day: 50 }).format('YYYY-MM-DD'),
      0.1);
  }
}

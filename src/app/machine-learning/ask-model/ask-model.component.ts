import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material';
import { FormGroup, FormBuilder } from '@angular/forms';
import { BacktestService } from '../../shared';

export interface TrainingResults {
  algorithm?: string;
  guesses: number;
  correct: number;
  score: number;
  nextOutput:number;
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
    public snackBar: MatSnackBar) { }

  ngOnInit() {
    this.endDate = new Date();
    this.startDate = moment().subtract({ day: 500 }).toDate();

    this.form = this._formBuilder.group({
      query: this.symbol
    });

    this.models = [
      { name: 'Open Price Up', code: 'open_price_up' },
      { name: 'Test', code: 'test' }
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
      }
    }
  }

  activate() {
    switch (this.selectedModel.code) {
      case 'open_price_up': {
        this.activateOpenUp();
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
}

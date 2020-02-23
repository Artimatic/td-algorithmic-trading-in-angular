import { Component, OnInit } from '@angular/core';
import { BacktestService } from '../../shared';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material';
import { FormGroup, FormBuilder } from '@angular/forms';

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

  constructor(
    private _formBuilder: FormBuilder,
    public snackBar: MatSnackBar) { }

  ngOnInit() {
    this.endDate = new Date();
    this.startDate = moment().subtract(6, 'days').toDate();

    this.form = this._formBuilder.group({
      query: this.symbol
    });
    this.isLoading = false;
  }
}

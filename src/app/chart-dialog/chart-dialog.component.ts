import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ChartParam } from '../shared/services/backtest.service';
import { MAT_DIALOG_DATA } from '@angular/material';

export interface AlgorithmSelection {
  value: string;
  viewValue: string;
}

export interface AlgorithmSelection {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-chart-dialog',
  templateUrl: './chart-dialog.component.html',
  styleUrls: ['./chart-dialog.component.css']
})
export class ChartDialogComponent implements OnInit {
  smaForm: FormGroup;
  algorithms: AlgorithmSelection[] = [
    { value: 'mfi', viewValue: 'Money Flow Index' },
    { value: 'sma', viewValue: 'Moving Average' },
    { value: 'bollingerband', viewValue: 'Bollinger Band' },
    { value: 'bollingerbandmfi', viewValue: 'Bollinger Band and MFI' },
    { value: 'macrossover', viewValue: 'Moving Average Crossover' }
  ];

  selectedAlgo = 'bollingerbandmfi';

  constructor(@Inject(MAT_DIALOG_DATA) public data: { chartData: any }, private _formBuilder: FormBuilder) { }

  ngOnInit() {
    this.selectedAlgo = this.data.chartData.algorithm;
    this.smaForm = this._formBuilder.group({
      deviation: new FormControl(this.data.chartData.params.deviation, Validators.required),
      fastAvg: new FormControl(this.data.chartData.params.fastAvg, Validators.required),
      slowAvg: new FormControl(this.data.chartData.params.slowAvg, Validators.required)
    });

  }

  useSelected(): ChartParam {
    this.data.chartData.algorithm = this.selectedAlgo;

    if (this.selectedAlgo === 'sma' || this.selectedAlgo === 'macrossover') {
      const params = {
        deviation: this.smaForm.value.deviation,
        fastAvg: this.smaForm.value.fastAvg,
        slowAvg: this.smaForm.value.slowAvg
      };
      this.data.chartData.params = params;
    }

    return this.data.chartData;
  }

}

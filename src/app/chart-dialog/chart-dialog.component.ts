import { Component, OnInit } from '@angular/core';

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

  algorithms: AlgorithmSelection[] = [
    {value: 'mfi', viewValue: 'Money Flow Index'},
    {value: 'sma', viewValue: 'Moving Average'},
    {value: 'bollingerband', viewValue: 'Bollinger Band'},
    {value: 'bollingerbandmfi', viewValue: 'Bollinger Band and MFI'}
  ];

  selectedAlgo = 'bollingerbandmfi';
  constructor() { }

  ngOnInit() {
  }

  useSelected() {
    return this.selectedAlgo;
  }

}

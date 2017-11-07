import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { RhTableComponent } from '../rh-table';
import { Chart } from 'angular-highcharts';

import { BacktestService, Stock, AlgoParam } from '../shared';

@Component({
  selector: 'app-chart-dialog',
  templateUrl: './chart-dialog.component.html',
  styleUrls: ['./chart-dialog.component.css']
})
export class ChartDialogComponent implements OnInit {
  chart;
  dataPoints: any[] = [];
  resolving: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<RhTableComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private algo: BacktestService) { }

  ngOnInit() {
    this.resolving = true;
    this.chart = new Chart({
      chart: {
        type: 'line'
      },
      title: {
        text: 'Linechart'
      },
      credits: {
        enabled: false
      },
      series: [{
        name: 'Line 1',
        data: [1, 2, 3]
      }]
    });

    // this.algo.getBacktest(this.data)
    //   .map(result => {
    //     this.dataPoints = [
    //       {
    //         key: this.data.ticker,
    //         values: [[result[0].date, 0]],
    //         color: '#268CBE',
    //         type: 'line'
    //       },
    //       {
    //         key: 'Buy',
    //         values: [],
    //         color: '#22DC22',
    //         type: 'bar'
    //       }
    //     ];

    //     result.slice(0, -1).forEach(day => {
    //       if (this.triggerCondition(day.close, day.thirtyAvg, day.ninetyAvg, this.data.deviation)) {
    //         if (day.trending === 'Sell') {
    //           this.dataPoints[0].values.push([day.date, day.close]);
    //         } else if (day.trending === 'Buy') {
    //           this.dataPoints[1].values.push([day.date, day.close]);
    //         } else {
    //           this.dataPoints[0].values.push([day.date, day.close]);
    //         }
    //       } else {
    //         this.dataPoints[0].values.push([day.date, day.close]);
    //       }
    //       console.log('add: ', [day.date, day.close]);

    //     });
    //     return result;
    //   })
    //   .subscribe(backtest => {
    //     console.log('results: ', backtest);

    //     this.resolving = false;
    //   });
    this.resolving = false;
  }

  triggerCondition(lastPrice, thirtyDay, ninetyDay, deviation) {
    if (this.calculatePercentDifference(thirtyDay, ninetyDay) <= deviation) {
      return true;
    }
    return false;
  }

  calculatePercentDifference(v1, v2) {
    return Math.abs(Math.abs(v1 - v2) / ((v1 + v2) / 2));
  }

  add() {
    this.chart.addPoint(Math.floor(Math.random() * 10));
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}

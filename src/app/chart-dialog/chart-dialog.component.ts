import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { RhTableComponent } from '../rh-table';
import { Chart } from 'angular-highcharts';
import { DataPoint, SeriesOptions } from 'highcharts';
import * as moment from 'moment';

import { BacktestService, Stock, AlgoParam } from '../shared';

@Component({
  selector: 'app-chart-dialog',
  templateUrl: './chart-dialog.component.html',
  styleUrls: ['./chart-dialog.component.css']
})
export class ChartDialogComponent implements OnInit {
  chart;
  resolving: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<RhTableComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private algo: BacktestService) { }

  ngOnInit() {
    this.resolving = true;

    this.algo.getBacktest(this.data)
      .map(result => {
        let time = [],
          seriesData = [];

        result.slice(0, -1).forEach(day => {
          time.push(day.date);
          if (this.triggerCondition(day.close, day.thirtyAvg, day.ninetyAvg, this.data.deviation)) {
            if (day.trending === 'Sell') {
              let signal: DataPoint = {
                y: day.close,
                marker: {
                  symbol: 'triangle-down',
                  fillColor: 'red',
                  radius: 5
                }
              };
              seriesData.push(signal);
            } else if (day.trending === 'Buy') {
              let signal: DataPoint = {
                y: day.close,
                marker: {
                  symbol: 'triangle',
                  fillColor: 'green',
                  radius: 5
                }
              };
              seriesData.push(signal);
            } else {
              seriesData.push(day.close);
            }
          } else {
            seriesData.push(day.close);
          }
        });

        this.chart = new Chart({
          chart: {
            type: 'spline',
            zoomType: 'x'
          },
          title: {
            text: 'Daily Price'
          },
          subtitle: {
            text: 'Source: Google Finance'
          },
          xAxis: {
            type: 'datetime',
            dateTimeLabelFormats: {
              month: '%e. %b',
              year: '%b'
            },
            labels: {
              formatter: function () {
                return moment(this.value).format('MMM D');
              }
            },
            categories: time
          },
          yAxis: {
            title: {
              text: 'Price'
            },
            labels: {
              formatter: function () {
                return '$' + this.value;
              }
            }
          },
          tooltip: {
            crosshairs: true,
            shared: true
          },
          plotOptions: {
            spline: {
              marker: {
                radius: 1,
                lineColor: '#666666',
                lineWidth: 1
              }
            },
            series: {
              marker: {
                enabled: true
              }
            }
          },
          series: [{
            name: 'Stock',
            data: seriesData
          }]
        });
        return result;
      })
      .subscribe(backtest => {

        this.resolving = false;
      });
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

  add(y: DataPoint) {
    this.chart.addPoint(y);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}

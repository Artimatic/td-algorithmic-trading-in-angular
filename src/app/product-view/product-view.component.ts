import { Component, OnInit } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { DataPoint, SeriesOptions } from 'highcharts';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material';

import { BacktestService, Stock, AlgoParam } from '../shared';
import { removeSummaryDuplicates } from '@angular/compiler';

@Component({
  selector: 'app-product-view',
  templateUrl: './product-view.component.html',
  styleUrls: ['./product-view.component.css']
})
export class ProductViewComponent implements OnInit {
  chart;
  resolving = false;
  stock: string;

  constructor(
    public snackBar: MatSnackBar,
    private algo: BacktestService) { }

  ngOnInit() {
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

  load(data): void {
    this.resolving = true;

    const currentDate = moment().format('YYYY-MM-DD');
    const pastDate = moment().subtract(700, 'days').format('YYYY-MM-DD');
    const requestBody = {
      ticker: data.stock,
      start: pastDate,
      end: currentDate,
      deviation: data.deviation,
      short: data.shortTerm,
      long: data.longTerm
    };

    this.algo.getBacktestChart(requestBody)
      .map(result => {
        const time = [],
          seriesData = [];
        let signal: DataPoint;

        result.forEach(day => {
          time.push(day.date);
          if (this.triggerCondition(day.close, day.shortTermAvg, day.longTermAvg, data.deviation)) {
            if (day.trending === 'Sell') {
              signal = {
                y: day.close,
                marker: {
                  symbol: 'triangle-down',
                  fillColor: 'red',
                  radius: 5
                },
                name: '<br><b>Short:</b> ' + day.shortTermAvg +
                  '<br><b>Long:</b> ' + day.longTermAvg +
                  '<br><b>Deviation:</b> ' + day.deviation
              };
            } else if (day.trending === 'Buy') {
              signal = {
                y: day.close,
                marker: {
                  symbol: 'triangle',
                  fillColor: 'green',
                  radius: 5
                },
                name: '<br><b>Short:</b> ' + day.shortTermAvg +
                  '<br><b>Long:</b> ' + day.longTermAvg +
                  '<br><b>Deviation:</b> ' + day.deviation
              };
            } else {
              signal = {
                y: day.close,
                name: '<br><b>Short:</b> ' + day.shortTermAvg +
                  '<br><b>Long:</b> ' + day.longTermAvg +
                  '<br><b>Deviation:</b> ' + day.deviation
              };
            }
          } else {
            signal = {
              y: day.close,
              name: '<br><b>Short:</b> ' + day.shortTermAvg +
                '<br><b>Long:</b> ' + day.longTermAvg +
                '<br><b>Deviation:</b> ' + day.deviation
            };
          }
          seriesData.push(signal);
        });

        this.initChart (data.stock, time, seriesData);

        return result;
      })
      .subscribe(
        response => {
          this.stock = data.stock;
          this.resolving = false;
        },
        err => {
          this.resolving = false;
          this.snackBar.open('There was an error.', 'Dismiss', {
            duration: 2000,
          });
        }
      );
  }

  loadV2Chart(data, endDate): void {
    this.resolving = true;

    const currentDate = moment(endDate).format('YYYY-MM-DD');
    const startDate = moment(endDate).subtract(700, 'days').format('YYYY-MM-DD');

    this.algo.getInfoV2Chart(data.stock, currentDate, startDate)
      .map(result => {
        const time = [],
          seriesData = [];
        let signal: DataPoint;
        result.forEach(day => {
          time.push(day.date);
          switch (day.action) {
            case 'SELL':
              signal = {
                y: day.close,
                marker: {
                  symbol: 'triangle-down',
                  fillColor: 'pink',
                  radius: 3
                },
                name: '<br><b>Volume:</b> ' + day.volume
              };
              break;
            case 'STRONGSELL':
              signal = {
                y: day.close,
                marker: {
                  symbol: 'triangle-down',
                  fillColor: 'red',
                  radius: 6
                },
                name: '<br><b>Volume:</b> ' + day.volume
              };
              break;
            case 'BUY':
              signal = {
                y: day.close,
                marker: {
                  symbol: 'triangle',
                  fillColor: 'green',
                  radius: 3
                },
                name: '<br><b>Volume:</b> ' + day.volume
              };
              break;
            case 'STRONGBUY':
              signal = {
                y: day.close,
                marker: {
                  symbol: 'triangle',
                  fillColor: 'green',
                  radius: 6
                },
                name: '<br><b>Volume:</b> ' + day.volume
              };
              break;
            case 'INDETERMINANT':
              signal = {
                y: day.close,
                name: '<br><b>Volume:</b> ' + day.volume
              };
              break;
            default:
              throw new Error(`Unknown signal: ${day.action}`);
          }

          seriesData.push(signal);

          this.initChart (data.stock, time, seriesData);
        });
      })
      .subscribe(
        response => {
          this.stock = data.stock;
          this.resolving = false;
        },
        err => {
          this.resolving = false;
          this.snackBar.open(`Error: ${err}`, 'Dismiss', {
            duration: 20000,
          });
        }
      );
  }

  initChart (title, timeArr, seriesData) {
    this.chart = new Chart({
      chart: {
        type: 'spline',
        zoomType: 'x'
      },
      title: {
        text: title
      },
      subtitle: {
        text: 'Daily Price'
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
        categories: timeArr
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
        shared: true,
        formatter: function () {
          return '<b>Date:</b>' + moment(this.x).format('YYYY-MM-DD') + '<br><b>Price:</b> ' + this.y + '<br>' + this.points[0].key;
        }
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
          },
          turboThreshold: 5000
        }
      },
      series: [{
        name: 'Stock',
        data: seriesData
      }]
    });

  }
}

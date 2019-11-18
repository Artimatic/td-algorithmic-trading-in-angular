import { Component, OnInit } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { Point } from 'highcharts';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material';

import { BacktestService } from '../shared';
import { ChartParam } from '../shared/services/backtest.service';

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
    this.algo.currentChart.subscribe((chart: ChartParam) => {
      switch (chart.algorithm) {
        case 'mfi': {
          break;
        }
        case 'sma': {
          this.loadSma(chart, chart.date);
          break;
        }
        case 'bollingerband': {
          this.loadBBChart(chart.symbol, chart.date);
          break;
        }
        case 'bollingerbandmfi': {
          this.loadBBMfiChart(chart);
          break;
        }
      }
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

  add(y: Point) {
    this.chart.addPoint(y);
  }

  loadBBMfiChart(params: ChartParam) {
    this.resolving = true;
    const currentDate = moment(params.date).format('YYYY-MM-DD');
    const pastDate = moment(params.date).subtract(800, 'days').format('YYYY-MM-DD');
    this.algo.getBBMfiBacktestChart(params.symbol, currentDate, pastDate)
      .map(result => {
        const time = [];
        const seriesData = [];

        result.signals.forEach(day => {
          time.push(day.date);
          let signal = this.buildSignal(day.action, day.close, day.volume);
          seriesData.push(signal);

          this.initChart(params.symbol, time, seriesData);
        });
      })
      .subscribe(
        response => {
          this.stock = params.symbol;
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

  loadSma(data, endDate): void {
    this.resolving = true;

    const currentDate = moment(endDate).format('YYYY-MM-DD');
    const pastDate = moment(endDate).subtract(700, 'days').format('YYYY-MM-DD');

    this.algo.getBacktestChart(data.symbol, pastDate, currentDate, data.deviation || 0.003, data.shortTerm || 30, data.longTerm || 90)
      .map(result => {
        const time = [],
          seriesData = [];
        let signal;

        result.forEach(day => {
          time.push(day.date);
          if (this.triggerCondition(day.close, day.shortTermAvg, day.longTermAvg, data.deviation || 0.003)) {
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

        this.initChart(data.stock, time, seriesData);

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

  buildSignal(action: string, close: number, volume: number) {
    switch (action) {
      case 'SELL':
        return {
          y: close,
          marker: {
            symbol: 'triangle-down',
            fillColor: 'pink',
            radius: 3
          },
          name: '<br><b>Volume:</b> ' + volume
        };
      case 'STRONGSELL':
        return {
          y: close,
          marker: {
            symbol: 'triangle-down',
            fillColor: 'red',
            radius: 6
          },
          name: '<br><b>Volume:</b> ' + volume
        };
      case 'BUY':
        return {
          y: close,
          marker: {
            symbol: 'triangle',
            fillColor: 'green',
            radius: 3
          },
          name: '<br><b>Volume:</b> ' + volume
        };
      case 'STRONGBUY':
        return {
          y: close,
          marker: {
            symbol: 'triangle',
            fillColor: 'green',
            radius: 6
          },
          name: '<br><b>Volume:</b> ' + volume
        };
      default:
        return {
          y: close,
          name: '<br><b>Volume:</b> ' + volume
        };
    }
  }
  loadBBChart(stock: string, endDate): void {
    this.resolving = true;

    const currentDate = moment(endDate).format('YYYY-MM-DD');
    const startDate = moment(endDate).subtract(700, 'days').format('YYYY-MM-DD');

    this.algo.getInfoV2Chart(stock, currentDate, startDate)
      .map(result => {
        const time = [];
        const seriesData = [];

        result.forEach(day => {
          time.push(day.date);
          let signal = this.buildSignal(day.action, day.close, day.volume);
          seriesData.push(signal);

          this.initChart(stock, time, seriesData);
        });
      })
      .subscribe(
        response => {
          this.stock = stock;
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

  initChart(title, timeArr, seriesData) {
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

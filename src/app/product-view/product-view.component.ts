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
  backtestResults: any[];

  constructor(
    public snackBar: MatSnackBar,
    private algo: BacktestService) { }

  ngOnInit() {
    this.algo.currentChart.subscribe((chart: ChartParam) => {
      switch (chart.algorithm) {
        case 'mfi': {
          this.loadMfi(chart);
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
        case 'macrossover': {
          this.loadMaCrossOverChart(chart);
          break;
        }
        case 'findresistance': {
          this.loadFindResistanceChart(chart);
          break;
        }
        case 'all': {
          this.loadDefaultChart(chart, null);
          break;
        }
        default: {
          this.loadDefaultChart(chart, chart.algorithm);
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
        this.initBacktestResults(params.symbol, result, result.signals);
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

  loadMaCrossOverChart(data: ChartParam) {
    this.resolving = true;
    const currentDate = moment(data.date).format('YYYY-MM-DD');
    const pastDate = moment(data.date).subtract(800, 'days').format('YYYY-MM-DD');

    this.algo.getMaCrossOverBacktestChart(data.symbol, currentDate,
      pastDate, data.params.fastAvg || 30,
      data.params.slowAvg || 90)
      .map(result => {
        this.initBacktestResults(data.symbol, result, result.signals);
      })
      .subscribe(
        response => {
          this.stock = data.symbol;
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

  loadFindResistanceChart(data: ChartParam) {
    this.resolving = true;
    const currentDate = moment(data.date).format('YYYY-MM-DD');
    const pastDate = moment(data.date).subtract(800, 'days').format('YYYY-MM-DD');

    this.algo.getResistanceChart(data.symbol, pastDate, currentDate)
      .map(result => {
        this.initBacktestResults(data.symbol, result, result.signals);
      })
      .subscribe(
        response => {
          this.stock = data.symbol;
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

  loadChart(data: ChartParam) {
    this.resolving = true;
    const currentDate = moment(data.date).format('YYYY-MM-DD');
    const pastDate = moment(data.date).subtract(365, 'days').format('YYYY-MM-DD');

    this.algo.getBacktestEvaluation(data.symbol, pastDate, currentDate, data.algorithm)
      .map(result => {
        this.initBacktestResults(data.symbol, result, result.signals);
      })
      .subscribe(
        response => {
          this.stock = data.symbol;
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

  initBacktestResults(symbol, result, signals) {
    this.backtestResults = [result];
    const time = [];
    const seriesData = [];

    signals.forEach(day => {
      time.push(day.date);
      const signal = this.buildSignal(day.action, day.close, day.volume, '');
      seriesData.push(signal);

      this.initChart(symbol, time, seriesData);
    });
  }

  initDefaultResults(symbol, result, signals, indicator: string) {
    if (indicator) {
      result.algo = indicator;
    }
    this.backtestResults = [result];
    const time = [];
    const seriesData = [];

    signals.forEach(day => {
      let action = day.action;
      if (indicator) {
        const recommendation = day.recommendation[indicator].toUpperCase();
        switch (recommendation) {
          case 'BEARISH': {
            action = 'STRONGSELL';
            break;
          }
          case 'BULLISH': {
            action = 'STRONGBUY';
            break;
          }
          default: {
            action = 'INDETERMINANT';
            break;
          }
        }
      }
      time.push(day.date);
      const signal = this.buildSignal(action, day.close, day.volume, day.recommendation);
      seriesData.push(signal);

      this.initChart(symbol, time, seriesData);
    });
  }

  loadDefaultChart(data: ChartParam, indicator: string) {
    const defaultPeriod = 500;
    data.algorithm = 'daily-indicators';
    this.resolving = true;
    const currentDate = moment(data.date).format('YYYY-MM-DD');
    const pastDate = moment(data.date).subtract(defaultPeriod, 'days').format('YYYY-MM-DD');

    this.algo.getBacktestEvaluation(data.symbol, pastDate, currentDate, data.algorithm)
      .map(result => {
        if (result.signals > defaultPeriod) {
          result.signals = result.signals.slice(result.signals.length - defaultPeriod, result.signals.length);
        }
        this.initDefaultResults(data.symbol, result, result.signals, indicator);
      })
      .subscribe(
        response => {
          this.stock = data.symbol;
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

  loadMfi(data: ChartParam) {
    this.loadDefaultChart(data, 'mfi');
  }

  loadSma(data: ChartParam, endDate): void {
    this.resolving = true;

    const currentDate = moment(endDate).format('YYYY-MM-DD');
    const pastDate = moment(endDate).subtract(700, 'days').format('YYYY-MM-DD');

    this.algo.getBacktestChart(data.symbol,
      pastDate,
      currentDate,
      data.params.deviation || 0.003,
      data.params.fastAvg || 30,
      data.params.slowAvg || 90)
      .map(result => {
        const time = [],
          seriesData = [];
        let signal;

        result.forEach(day => {
          time.push(day.date);
          if (this.triggerCondition(day.close,
            day.shortTermAvg,
            day.longTermAvg,
            data.params.deviation || 0.003)) {
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

        this.initChart(data.symbol, time, seriesData);

        return result;
      })
      .subscribe(
        response => {
          this.stock = data.symbol;
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

  buildAlgoText(recommendations): string {
    let sellText = '<br><b>Sells: </b>';
    let buyText = '<br><b>Buys: </b>';

    const sellsArr = [];
    const buysArr = [];

    for (const key in recommendations) {
      if (recommendations[key].toLowerCase() !== 'neutral') {
        if (recommendations[key].toLowerCase() === 'bullish') {
          buysArr.push(key);
        } else if (recommendations[key].toLowerCase() === 'bearish') {
          sellsArr.push(key);
        }
      }
    }

    if (sellsArr.length > 0) {
      sellText += sellsArr.join(',');
    }

    if (buysArr.length > 0) {
      buyText += buysArr.join(',');
    }

    return buyText + sellText;
  }

  buildSignal(action: string, close: number, volume: number, recommendations: any) {
    switch (action) {
      case 'SELL':
        return {
          y: close,
          marker: {
            symbol: 'triangle-down',
            fillColor: 'pink',
            radius: 3
          },
          name: '<br><b>Volume:</b> ' + volume + this.buildAlgoText(recommendations)
        };
      case 'STRONGSELL':
        return {
          y: close,
          marker: {
            symbol: 'triangle-down',
            fillColor: 'red',
            radius: 6
          },
          name: '<br><b>Volume:</b> ' + volume + this.buildAlgoText(recommendations)
        };
      case 'BUY':
        return {
          y: close,
          marker: {
            symbol: 'triangle',
            fillColor: 'green',
            radius: 3
          },
          name: '<br><b>Volume:</b> ' + volume + this.buildAlgoText(recommendations)
        };
      case 'STRONGBUY':
        return {
          y: close,
          marker: {
            symbol: 'triangle',
            fillColor: 'green',
            radius: 6
          },
          name: '<br><b>Volume:</b> ' + volume + this.buildAlgoText(recommendations)
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
        this.initBacktestResults(stock, {}, result);
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
          return '<b>Date:</b>' +
            moment(this.x).format('YYYY-MM-DD') +
            '<br><b>Price:</b> ' +
            this.y + '<br>' + this.points[0].key;
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

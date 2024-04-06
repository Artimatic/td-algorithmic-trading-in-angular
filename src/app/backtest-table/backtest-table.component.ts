import { Component, OnInit } from '@angular/core';
import { BacktestService } from '@shared/services';
import * as moment from 'moment-timezone';
import { Chart } from 'angular-highcharts';
import { Point } from 'angular-highcharts/lib/chart';

import * as Highcharts from 'highcharts';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
@Component({
  selector: 'app-backtest-table',
  templateUrl: './backtest-table.component.html',
  styleUrls: ['./backtest-table.component.css']
})
export class BacktestTableComponent implements OnInit {
  chart: Chart;
  volumeChart: Chart;
  constructor(private backtestService: BacktestService, public config: DynamicDialogConfig) { }

  ngOnInit(): void {
    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });
    this.start(this.config.data.symbol);
  }

  async start(symbol: string) {
    const result = await this.backtestService.getYahooIntraday(symbol).toPromise();
    this.backtestService.postIntraday(result).toPromise();

    const startDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
    const futureDate = moment().add(1, 'days').format('YYYY-MM-DD');

    this.backtestService.getDaytradeBacktest(symbol,
      futureDate, startDate,
      {
        lossThreshold: 0.01,
        profitThreshold: 0.03,
        minQuotes: 81
      }).subscribe(results => {
        console.log('results', results);
        this.populateChart(symbol, results.signals);
      },
        error => {
          console.log(error);
        }
      );
  }

  initPriceChart(title, timestamps, seriesData): Chart {
    return new Chart({
      chart: {
        type: 'spline',
        marginLeft: 40, // Keep all charts left aligned
        marginTop: 0,
        marginBottom: 0,
        width: 800,
        height: 175
      },
      title: {
        text: '',
        style: {
          display: 'none'
        }
      },
      subtitle: {
        text: '',
        style: {
          display: 'none'
        }
      },
      legend: {
        enabled: false
      },
      xAxis: {
        type: 'datetime',
        dateTimeLabelFormats: {
          second: '%H:%M:%S',
          minute: '%H:%M',
          hour: '%H:%M'
        },
        labels: {
          formatter: function () {
            return moment(this.value).format('hh:mm');
          }
        },
        categories: timestamps
      },
      tooltip: {
        crosshairs: true,
        shared: true,
        formatter: function () {
          return moment(this.x).format('hh:mm') + '<br><h3>Price:</h3> ' + Number(this.y).toFixed(2) + '<br>' +
            '<h3>indicators:</h3> ' + this.points[0].point.options.description;
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
        name: title,
        data: seriesData
      }]
    });
  }
  
  populateChart(symbol, indicators) {
    const volume = [];
    const points = [];
    const timestamps = [];

    indicators.forEach(quote => {
      if (quote.close) {
        const closePrice = quote.close;
        const time = moment.utc(quote.date).tz('America/New_York').valueOf();
        const point: Point = {
          y: closePrice
        };

        const vwmaDesc = quote.vwma ? `[vwma:${quote.vwma.toFixed(2)}]` : '';
        const mfiDesc = `[mfi:${quote.mfiLeft}]`;

        point.description = `${vwmaDesc}${mfiDesc}`;

        point.description += `[macd: ${quote.recommendation.macd}] `;
        point.description += `[bband: ${quote.recommendation.bband}]`;

        if (quote.recommendation.recommendation.toLowerCase() === 'buy') {
          point.marker = {
            symbol: 'triangle',
            fillColor: 'green',
            radius: 5
          };
        } else if (quote.recommendation.recommendation.toLowerCase() === 'sell') {
          point.marker = {
            symbol: 'triangle-down',
            fillColor: 'red',
            radius: 5
          };
        }

        points.push(point);
        timestamps.push(time);
        volume.push([
          moment(quote.date).valueOf(), // the date
          quote.volume // the volume
        ]);
      }
    });

    this.chart = this.initPriceChart(symbol, timestamps, points);
  }
}

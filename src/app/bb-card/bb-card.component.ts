import { Component, OnInit, EventEmitter, Input } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/concat';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { Chart } from 'angular-highcharts';
import { DataPoint, SeriesOptions } from 'highcharts';
import * as Highcharts from 'highcharts';

import * as moment from 'moment';

import { BacktestService } from '../shared';
import { Order } from '../shared/models/order';

@Component({
  selector: 'app-bb-card',
  templateUrl: './bb-card.component.html',
  styleUrls: ['./bb-card.component.css']
})
export class BbCardComponent implements OnInit {
  @Input() order: Order;
  chart;
  volumeChart;

  constructor(private backtestService: BacktestService) { }

  ngOnInit() {
  }

  async getBBand(real: any[]): Promise<any[]> {
    const body = {
      real: real,
      period: 80,
      stddev: 2
    };

    return await this.backtestService.getBBands(body).toPromise();
  }

  async load() {
    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });

    const requestBody = {
      symbol: this.order.holding.symbol
    };

    const data = await this.backtestService.getTestData(requestBody).toPromise();

    if (data.chart.result[0].timestamp) {

      this.chart = this.initPriceChart(this.order.holding.symbol, this.order.holding.name);

      const ohlc = [],
        volume = [],
        batch = [],
        timestamps = data.chart.result[0].timestamp,
        dataLength = timestamps.length,
        quotes = data.chart.result[0].indicators.quote[0];

      let i = 0;

      for (i; i < dataLength; i += 1) {
        const closePrice = quotes.close[i];

        volume.push([
          moment.unix(timestamps[i]).valueOf(), // the date
          quotes.volume[i] // the volume
        ]);

        const point: DataPoint = {};

        point.x = moment.unix(timestamps[i]).valueOf(); // the date
        point.y = closePrice; // close

        if (i > 80) {
          const real = quotes.close.slice(i - 80, i + 1);
          const band = await this.getBBand(real);

          if (band.length === 3) {
            const upper = band[2],
              mid = band[1],
              lower = band[0];

            if (lower.length > 0 && closePrice < lower[0]) {
              point.marker = {
                symbol: 'triangle',
                fillColor: 'green',
                radius: 5
              };
            } else if (upper.length > 0 && closePrice > upper[0]) {
              point.marker = {
                symbol: 'triangle-down',
                fillColor: 'red',
                radius: 5
              };
            }
          }
        }

        this.chart.addPoint(point);

        batch.push({
          x: moment.unix(timestamps[i]).valueOf(), // the date
          y: quotes.close[i] // close
        });
      }

      this.volumeChart = this.initVolumeChart('Volume', volume);
    }
  }
  initVolumeChart(title, data): Chart {
    return new Chart({
      chart: {
        type: 'column',
        marginLeft: 40, // Keep all charts left aligned
        spacingTop: 20,
        spacingBottom: 20
      },
      title: {
        text: title
      },
      xAxis: {
        type: 'datetime',
        labels: {
          formatter: function () {
            return moment(this.value).format('hh:mm');
          }
        }
      },
      yAxis: {
        endOnTick: false,
        startOnTick: false,
        labels: {
          enabled: false
        },
        title: {
          text: null
        },
        tickPositions: [0]
      },
      tooltip: {
        crosshairs: true,
        shared: true,
        formatter: function () {
          return moment(this.x).format('hh:mm') + '<br><b>Volume:</b> ' + this.y + '<br>' + this.points[0].key;
        }
      },
      series: [
        {
          name: 'Volume',
          id: 'volume',
          data: data
        }]
    });
  }
  initPriceChart(title, subtitle): Chart {
    return new Chart({
      chart: {
        type: 'spline',
        zoomType: 'x',
        marginLeft: 40, // Keep all charts left aligned
        spacingTop: 20,
        spacingBottom: 20
      },
      title: {
        text: title
      },
      subtitle: {
        text: subtitle
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
        }
      },
      yAxis: {
        endOnTick: false,
        startOnTick: false,
        labels: {
          enabled: false
        },
        title: {
          text: null
        },
        tickPositions: [0]
      },
      tooltip: {
        crosshairs: true,
        shared: true,
        formatter: function () {
          return moment(this.x).format('hh:mm') + '<br><b>Price:</b> ' + this.y + '<br>';
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
          }
        }
      },
      series: [{
        name: title,
        id: title,
        data: []
      }]
    });
  }
}

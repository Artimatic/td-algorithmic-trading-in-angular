import { Component, OnInit, EventEmitter, Input } from '@angular/core';
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
    this.load();
  }

  load(): void {
    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });
    const requestBody = {
      symbol: this.order.holding.symbol
    };

    this.backtestService.getTestData(requestBody)
      .map(data => {
        var ohlc = [],
          volume = [],
          timestamps = data.chart.result[0].timestamp,
          dataLength = timestamps.length,
          quotes = data.chart.result[0].indicators.quote[0],
          i = 0;

        for (i; i < dataLength; i += 1) {
          ohlc.push([
            moment.unix(timestamps[i]).valueOf(), // the date
            quotes.open[i], // open
            quotes.high[i], // high
            quotes.low[i], // low
            quotes.close[i] // close
          ]);

          volume.push([
            moment.unix(timestamps[i]).valueOf(), // the date
            quotes.volume[i] // the volume
          ]);
        }

        this.chart = new Chart({
          chart: {
            marginLeft: 40, // Keep all charts left aligned
            spacingTop: 20,
            spacingBottom: 20
          },
          title: {
            text: this.order.holding.symbol
          },
          subtitle: {
            text: this.order.holding.name
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
              return moment(this.x).format('hh:mm') + '<br><b>Price:</b> ' + this.y + '<br>' + this.points[0].key;
            }
          },
          series: [{
            name: this.order.holding.symbol,
            id: this.order.holding.symbol,
            data: ohlc
          }]
        });

        this.volumeChart = new Chart({
          chart: {
            type: 'column',
            marginLeft: 40, // Keep all charts left aligned
            spacingTop: 20,
            spacingBottom: 20
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
              data: volume
            }]
        });
        return data;
      })
      .subscribe(
        response => {
        }
      );
  }
}

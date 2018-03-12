import { Component, OnInit, EventEmitter, Input } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { DataPoint, SeriesOptions } from 'highcharts';
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
    const requestBody = {
      symbol: this.order.holding.symbol
    };

    this.backtestService.getIntraday(requestBody)
      .map(data => {
        var ohlc = [],
          volume = [],
          timestamps = data.chart.result[0].timestamp,
          dataLength = timestamps.length,
          quotes = data.chart.result[0].indicators.quote[0],
          i = 0;

        for (i; i < dataLength; i += 1) {
          ohlc.push([
            timestamps[i], // the date
            quotes.open[i], // open
            quotes.high[i], // high
            quotes.low[i], // low
            quotes.close[i] // close
          ]);

          volume.push([
            timestamps[i], // the date
            timestamps[i].volume // the volume
          ]);
        }

        this.chart = new Chart({
          chart: {
            marginLeft: 40, // Keep all charts left aligned
            spacingTop: 20,
            spacingBottom: 20
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
            labels: {
              enabled: false
            },
            title: {
              text: null
            },
            startOnTick: false,
            endOnTick: false,
            tickPositions: []
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

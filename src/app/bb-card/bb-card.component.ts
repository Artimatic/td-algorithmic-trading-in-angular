import { Component, OnInit, EventEmitter, Input } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { DataPoint, SeriesOptions } from 'highcharts';

import { BacktestService } from '../shared';

@Component({
  selector: 'app-bb-card',
  templateUrl: './bb-card.component.html',
  styleUrls: ['./bb-card.component.css']
})
export class BbCardComponent implements OnInit {
  @Input() order: any;
  chart;

  constructor(private backtestService: BacktestService) { }

  ngOnInit() {
    this.load();
  }

  load(): void {
    const data = [71, 78, 39, 66];

    this.chart = new Chart({
      chart: {
        type: 'spline',
        marginRight: 10,
        events: {
            load: function () {

                // set up the updating of the chart each second
                let series = this.series[0];
                setInterval(function () {
                    let x = (new Date()).getTime(), // current time
                        y = Math.random();
                    series.addPoint([x, y], true, true);
                }, 1000);
            }
        }
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
      series: [{
        name: 'Random data',
        data: (function () {
            // generate an array of random data
            let data = [],
                time = (new Date()).getTime(),
                i;

            for (i = -19; i <= 0; i += 1) {
                data.push({
                    x: time + i * 1000,
                    y: Math.random()
                });
            }
            return data;
        }())
    }]
    });
  }
}

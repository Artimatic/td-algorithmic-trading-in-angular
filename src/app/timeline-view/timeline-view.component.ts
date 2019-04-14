import { Component, OnInit } from '@angular/core';
import { BacktestService } from '../shared';
import * as moment from 'moment';
import { MatSnackBar } from '../../../node_modules/@angular/material';
import { Chart } from 'angular-highcharts';
import { FormGroup, FormBuilder } from '../../../node_modules/@angular/forms';

@Component({
  selector: 'app-timeline-view',
  templateUrl: './timeline-view.component.html',
  styleUrls: ['./timeline-view.component.css']
})
export class TimelineViewComponent implements OnInit {
  public startDate: Date;
  public endDate: Date;
  openPriceChart: Chart;
  closePriceChart: Chart;
  form: FormGroup;
  symbol = 'SPY';

  constructor(
    private _formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private backtestService: BacktestService) { }

  ngOnInit() {
    this.endDate = new Date();
    this.startDate = moment().subtract(6, 'days').toDate();

    this.form = this._formBuilder.group({
      query: this.symbol
    });
  }

  findTimeline(): void {
    const endDate = moment(this.endDate).format('YYYY-MM-DD');
    const startDate = moment(this.startDate).format('YYYY-MM-DD');

    this.backtestService.getTimeline(this.form.value.query, startDate, endDate)
      .map(result => {

        const openPriceSeries = this.parseTimelineData(result, 2);
        const closePriceSeries = this.parseTimelineData(result, 1);

        this.openPriceChart = this.initChart(openPriceSeries);
        this.closePriceChart = this.initChart(closePriceSeries);

        return;
      })
      .subscribe((timelineData: any) => {
        console.log('time: ', timelineData);
      }, error => {
        console.log('error: ', error);
        this.snackBar.open(`Error`, 'Dismiss');
      });
  }

  parseTimelineData(timelineMatchArr, referenceIdx) {
    const greenSeries = [],
      redSeries = [],
      constant = [],
      counts = [];

    timelineMatchArr[0].forEach((day) => {
      constant.push(day.input[referenceIdx]);
      counts.push({});
    });

    const constantLen = constant.length;

    if (timelineMatchArr.length > 1) {
      for (let i = 1, c = timelineMatchArr.length; i < c; i++) {
        const current = timelineMatchArr[i];
        for (let j = 0, cc = current.length; j < cc; j++) {
          const signal = current[j].input[referenceIdx];
          if (j < constant.length) {
            if (signal) {
              if (j >= counts.length) {
                counts.push({ up: 1, down: 0, total: 1 });
              } else {
                counts[j].up++;
                counts[j].total++;
              }
            } else {
              if (j >= counts.length) {
                counts.push({ up: 0, down: 1, total: 1 });
              } else {
                counts[j].down++;
                counts[j].total++;
              }
            }
          }
        }
      }

      greenSeries.push({ x: constantLen - 1, y: constant[constantLen - 1] });
      redSeries.push({ x: constantLen - 1, y: constant[constantLen - 1] });

      const countsLen = counts.length;
      if (countsLen > constantLen) {
        for (let k = constantLen; k < countsLen; k++) {
          const sums = counts[k];

          greenSeries.push({ x: k, y: 1, name: `Closed up: ${sums.up}\/${sums.total}` });
          redSeries.push({ x: k, y: 0, name: `Closed down: ${sums.down}\/${sums.total}` });
        }
      }


      return [{
        name: 'Constant',
        data: constant
      }, {
        name: 'Green',
        data: greenSeries,
        dashStyle: 'dash'
      }, {
        name: 'Red',
        data: redSeries,
        dashStyle: 'dash'
      }];
    }
  }

  initChart(series: any): Chart {
    return new Chart({
      chart: {
        type: 'line'
      },
      title: {
        text: 'Timeline'
      },
      credits: {
        enabled: false
      },
      tooltip: {
        crosshairs: true,
        shared: false,
        formatter: function () {
          return `${this.point.name || this.y}`;
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
      series: series
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { BacktestService } from '../../shared';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Chart } from 'angular-highcharts';
import { FormGroup, FormBuilder } from '@angular/forms';
import { TodoService } from '../../overview/todo-list/todo.service';

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
  isLoading: boolean;

  constructor(
    private _formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private backtestService: BacktestService,
    private todoService: TodoService) { }

  ngOnInit() {
    this.endDate = new Date();
    this.startDate = moment().subtract(6, 'days').toDate();

    this.form = this._formBuilder.group({
      query: this.symbol
    });
    this.isLoading = false;
    this.todoService.setMarketAnalysis();
  }

  findTimeline(): void {
    this.isLoading = true;
    const endDate = moment(this.endDate).format('YYYY-MM-DD');
    const startDate = moment(this.startDate).format('YYYY-MM-DD');
    this.backtestService.getTimeline(this.form.value.query, startDate, endDate)
      .map(result => {

        const openPriceSeries = this.parseTimelineData(result, 2);
        const closePriceSeries = this.parseTimelineData(result, 1);

        this.openPriceChart = this.initChart(openPriceSeries);
        this.closePriceChart = this.initChart(closePriceSeries);

        return result;
      })
      .subscribe((timelineData: any) => {
        console.log('time: ', timelineData);
        this.isLoading = false;
      }, error => {
        console.log('error: ', error);
        this.snackBar.open(`Error`, 'Dismiss');
        this.isLoading = false;
      });
  }

  initUpPoint() {
    return { up: 1, down: 0, total: 1 };
  }

  initDownPoint() {
    return { up: 0, down: 1, total: 1 };
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
          if (j >= constant.length) {
            if (signal === 1) {
              if (j >= counts.length) {
                counts.push(this.initUpPoint());
              } else {
                counts[j].up++;
                counts[j].total++;
              }
            } else if (signal === 0) {
              if (j >= counts.length) {
                counts.push(this.initDownPoint());
              } else {
                counts[j].down++;
                counts[j].total++;
              }
            } else {
              throw new TypeError('Unknown signal');
            }
          }
        }
      }

      greenSeries.push({ x: constantLen - 1, y: constant[constantLen - 1] });
      redSeries.push({ x: constantLen - 1, y: constant[constantLen - 1] });

      const countsLen = counts.length;
      if (constantLen < countsLen) {
        for (let k = constantLen; k < countsLen; k++) {
          const sums = counts[k];

          let title = 'Unknown';
          switch (referenceIdx) {
            case 1:
              title = ' Closed';
              break;
            case 2:
              title = 'Opened';
              break;
          }
          greenSeries.push({ x: k, y: 1, name: `${title} up: ${sums.up}\/${sums.total}` });
          redSeries.push({ x: k, y: 0, name: `${title} down: ${sums.down}\/${sums.total}` });
        }
      }


      return [{
        name: 'Matching Sequence',
        data: constant
      }, {
        name: 'Up days',
        data: greenSeries,
        dashStyle: 'dash'
      }, {
        name: 'Down days',
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

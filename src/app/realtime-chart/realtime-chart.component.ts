import { Component, OnInit } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { DataPoint, SeriesOptions } from 'highcharts';
import * as moment from 'moment';

@Component({
  selector: 'app-realtime-chart',
  templateUrl: './realtime-chart.component.html',
  styleUrls: ['./realtime-chart.component.css']
})
export class RealtimeChartComponent implements OnInit {
  chart;

  constructor() { }

  ngOnInit() {
  }

}

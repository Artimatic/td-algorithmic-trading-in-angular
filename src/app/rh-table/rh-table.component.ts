import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { BacktestService, Stock, AlgoParam, RhDataSource } from '../shared';

@Component({
  selector: 'app-rh-table',
  templateUrl: './rh-table.component.html',
  styleUrls: ['./rh-table.component.css']
})
export class RhTableComponent implements OnInit, OnChanges {
  @Input() data: AlgoParam[];
  @Input() displayedColumns: string[];
  private stockList: Stock[] = [];
  dataSource: RhDataSource | null;

  constructor(private algo: BacktestService) { }

  ngOnInit() {
    this.dataSource = new RhDataSource(this.stockList);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.data) {
      this.getData(changes.data.currentValue);
    }
  }

  getData(algoParam) {
    algoParam.forEach((param) => {
      this.algo.postMeanReversion(param).subscribe((stockData) => {
        stockData.stock = param.ticker;
        stockData.totalReturns = +((stockData.totalReturns*100).toFixed(2));
        this.stockList.push(stockData);
        this.dataSource = new RhDataSource(this.stockList);
      });
    });
  }
}

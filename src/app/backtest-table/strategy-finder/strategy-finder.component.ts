import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { BacktestTableService } from '../backtest-table.service';

@Component({
  selector: 'app-strategy-finder',
  templateUrl: './strategy-finder.component.html',
  styleUrls: ['./strategy-finder.component.css']
})
export class StrategyFinderComponent implements OnInit {

  constructor(public config: DynamicDialogConfig, private backTestTableService: BacktestTableService) { }

  ngOnInit(): void {
    console.log('backtestdata', this.config.data);
    // const backtestStore = this.backTestTableService.getStorage('backtest');
    // const orderHistory = this.backTestTableService.getStorage('orderHistory');
  }
}

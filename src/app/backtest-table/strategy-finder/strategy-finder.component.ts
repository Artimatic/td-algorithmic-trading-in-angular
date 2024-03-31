import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { BacktestTableService } from '../backtest-table.service';
import { MachineDaytradingService } from 'src/app/machine-daytrading/machine-daytrading.service';

@Component({
  selector: 'app-strategy-finder',
  templateUrl: './strategy-finder.component.html',
  styleUrls: ['./strategy-finder.component.css']
})
export class StrategyFinderComponent implements OnInit {

  constructor(public config: DynamicDialogConfig, 
    private backTestTableService: BacktestTableService,
    private machineDaytradingService: MachineDaytradingService) { }

  ngOnInit(): void {
    console.log('backtestdata', this.config.data);
    // const backtestStore = this.backTestTableService.getStorage('backtest');
    // const orderHistory = this.backTestTableService.getStorage('orderHistory');
    // const stock = this.machineDaytradingService.getNextStock();
    
    // ['META', 'NFLX', 'AAPL', 'GOOG', 'MDB', 'TWLO', 'W'].forEach(async stock => {
    //   await this.backTestTableService.getBacktestData(stock);
    // });

    const backtestData = this.backTestTableService.getStorage('backtest');
    for (const b in backtestData) {
      this.backTestTableService.findPair(backtestData[b].stock);
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { OrderTypes } from '@shared/models/smart-order';
import { CartService } from '@shared/services';
import { BacktestTableService } from 'src/app/backtest-table/backtest-table.service';

@Component({
  selector: 'app-add-options-trade',
  templateUrl: './add-options-trade.component.html',
  styleUrls: ['./add-options-trade.component.css']
})
export class AddOptionsTradeComponent implements OnInit {
  formGroup: FormGroup | undefined;

  constructor(private backtestTableService: BacktestTableService,
    private cartService: CartService) { }


  ngOnInit() {
    this.formGroup = new FormGroup({
      text: new FormControl(null)
    });
    this.execute();
  }

  execute() {
    ['PFE', 'GOOGL', 'SNOW'].forEach(async (val) => {
      await this.buildStraddle(val);
    });
  }

  async buildStraddle(symbol: string) {
    let optionStrategy = null;
    const backtestResults = await this.backtestTableService.getBacktestData(symbol);
    if (backtestResults && backtestResults.ml > 0.5) {
      optionStrategy = await this.backtestTableService.getCallTrade(symbol);
    } else {
      optionStrategy = await this.backtestTableService.getPutTrade(symbol);
    }

    const price = this.backtestTableService.findOptionsPrice(optionStrategy.call.bid, optionStrategy.call.ask) + this.backtestTableService.findOptionsPrice(optionStrategy.put.bid, optionStrategy.put.ask);
    console.log('optionStrategy', optionStrategy, price);

    this.backtestTableService.addStraddle(symbol, price, optionStrategy);
  }
}

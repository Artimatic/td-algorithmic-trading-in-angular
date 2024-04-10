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
    console.log('optionStrategy', optionStrategy);

    const order = {
      holding: {
        instrument: null,
        symbol,
      },
      quantity: 1,
      price: optionStrategy.call.bid + optionStrategy.put.bid,
      submitted: false,
      pending: false,
      orderSize: 1,
      side: 'Buy',
      lossThreshold: -0.05,
      profitTarget: 0.1,
      trailingStop: -0.05,
      useStopLoss: true,
      useTrailingStopLoss: true,
      useTakeProfit: true,
      sellAtClose: false,
      allocation: null,
      primaryLeg: optionStrategy.call,
      secondaryLeg: optionStrategy.put,
      type: OrderTypes.options
    };

    this.cartService.addToCart(order);
  }


}

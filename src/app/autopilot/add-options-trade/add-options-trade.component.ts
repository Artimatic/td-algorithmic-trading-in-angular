import { Component, OnDestroy, OnInit } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Subject } from 'rxjs';
import { BacktestTableService } from 'src/app/backtest-table/backtest-table.service';

@Component({
  selector: 'app-add-options-trade',
  templateUrl: './add-options-trade.component.html',
  styleUrls: ['./add-options-trade.component.css']
})
export class AddOptionsTradeComponent implements OnInit, OnDestroy {
  symbolsQuery = null;
  defaultSuggestions = [{ label: 'PFE,GOOGL,SNOW' }];
  suggestionsArr = [];
  processSymbol$ = new Subject<string>();
  symbolsArr = [];
  isLoading = false;

  constructor(private backtestTableService: BacktestTableService,
    private ref: DynamicDialogRef) { }


  ngOnInit() {
    const storedSuggestions = this.backtestTableService.getStorage('straddle_suggestions');
    for (const s in storedSuggestions) {
      this.suggestionsArr.push({label: s})
    }
    this.suggestionsArr.push(this.defaultSuggestions);
    this.processSymbol$.subscribe(sym => {
      this.buildStraddle(sym);
    });
  }

  processList() {
    this.isLoading = true;
    this.symbolsQuery.forEach(query => {
      const symbol = query.label;
      if (symbol.includes(',')) {
        this.symbolsArr = query.label.trim().toUpperCase().split(',');
        this.buildStraddle(this.symbolsArr.pop());
      } else {
        this.buildStraddle(symbol);
      }
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
    this.saveToStorage(symbol);
    if (this.symbolsArr.length) {
      this.processSymbol$.next(this.symbolsArr.pop());
    } else {
      this.isLoading = false;
      this.closeDialog();
    }
  }


  filterItems(event) {
    if (event.query) {
      const foundSuggestions = this.suggestionsArr.filter(suggestion => suggestion.label.includes(event.query));
      if (foundSuggestions.length) {
        this.suggestionsArr = foundSuggestions;
      } else {
        this.suggestionsArr = [
          { label: event.query.toUpperCase() }
        ];
      }
    }
    this.suggestionsArr = [].concat(this.suggestionsArr);
    console.log('filter', this.suggestionsArr);
  }

  closeDialog() {
    this.ref.close();
  }

  saveToStorage(symbol) {
    this.backtestTableService.addToStorage('straddle_suggestions', symbol, true);
  }
  ngOnDestroy() {
    this.processSymbol$.next();
    this.processSymbol$.complete();
  }
}
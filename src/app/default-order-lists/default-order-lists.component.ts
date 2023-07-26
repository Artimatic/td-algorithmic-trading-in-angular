import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import * as _ from 'lodash';
import { CartService } from '../shared/services/cart.service';
import { Order } from '../shared/models/order';
import { Subject } from 'rxjs';
import {
  debounceTime, distinctUntilChanged, takeUntil
} from 'rxjs/operators';
import { MachineDaytradingService } from '../machine-daytrading/machine-daytrading.service';
import { SchedulerService } from '@shared/service/scheduler.service';
import { MenuItem, SelectItem } from 'primeng/api';

export interface DefaultOrders {
  label: string;
  allocation: number;
  side: string;
}

@Component({
  selector: 'app-default-order-lists',
  templateUrl: './default-order-lists.component.html',
  styleUrls: ['./default-order-lists.component.scss']
})
export class DefaultOrderListsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() display: boolean;
  @Input() hideButton: boolean;
  @Input() prefillOrderForm: Order;
  @Input() defaultLists: DefaultOrders[];
  templateOrders: SmartOrder[];
  addOrderFormGroup: FormGroup;
  selectedDefaultOrders = [];
  private amountChange = new Subject<number>();
  isLoading = false;
  sides: SelectItem[];
  errorMsg: string;
  destroy$ = new Subject();

  pageSteps: MenuItem[];
  cartStep = 0;
  cashBalance = null;
  symbolsQuery = null;
  suggestionsArr = [];

  constructor(private _formBuilder: FormBuilder,
    private cartService: CartService,
    private schedulerService: SchedulerService,
    private machineDaytradingService: MachineDaytradingService) { }

  ngOnInit() {
    this.display = false;
    this.hideButton = false;
    this.templateOrders = [];
    this.pageSteps = [{
      label: 'Shopping cart',
      command: () => {
        this.cartStep = 0;
      }
    },
    {
      label: 'Order confirmation',
      command: () => {
        this.cartStep = 1;
      }
    }
    ];

    this.amountChange
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.cashBalance = value;
      });

    this.sides = [
      { label: 'Buy', value: 'Buy' },
      { label: 'Sell', value: 'Sell' },
      { label: 'DayTrade', value: 'DayTrade' }
    ];

    this.setAddOrderForm();

    this.suggestionsArr = this.createDefaultList();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.prefillOrderForm) {
      this.setAddOrderForm();
    }
  }

  showDialog() {
    this.display = true;
  }

  readStockList() {
    console.log('symbolsquewry ', this.symbolsQuery);

    this.symbolsQuery.forEach(query => {
      const symbol = query.label;
      if (symbol.includes(',')) {
        const symbolsTextStr = query.label.trim().toUpperCase().split(',');
        symbolsTextStr.forEach(s => {
          this.addNewOrder(s);
        });
      } else {
        this.addNewOrder(symbol);
      }
    });
  }

  addNewOrder(symbol) {
    const allocationPct = this.addOrderFormGroup.value.allocation;
    this.addOrder(symbol, allocationPct, this.cashBalance);
  }

  addOrder(stock: string, allocationPct: number, total: number, side: string = '') {
    this.isLoading = true;
    stock = stock.toUpperCase();
    this.schedulerService.schedule(() => {
      const cb = (quantity, price) => {
        if (this.templateOrders.findIndex(val => val.holding.symbol === stock) === -1) {
          this.templateOrders.push(this.cartService.buildOrder(stock, quantity, price, side || this.addOrderFormGroup.value.side));
        }
        this.isLoading = false;
      };

      const reject = err => {
        this.isLoading = false;
        if (err) {
          this.errorMsg = err.error ? `${err.error}` : `${err}`;
        }
      };

      this.machineDaytradingService.addOrder(this.addOrderFormGroup.value.side, stock, allocationPct, total, cb, null, reject);
    }, 'adding_order', null, true, 3000);
  }

  addCustomList() {
    if (this.addOrderFormGroup.valid) {
      const stock = this.addOrderFormGroup.value.symbol;
      const allocationPct = this.addOrderFormGroup.value.allocation;
      const total = this.cashBalance;
      this.addOrder(stock, allocationPct, total);

      this.errorMsg = '';
    } else {
      this.errorMsg = 'Please fix errors.';
    }
  }

  addMachineTrade() {
    const stock = 'MACHINE';
    this.machineDaytradingService.allocationPct = this.addOrderFormGroup.value.allocation;
    this.machineDaytradingService.allocationTotal = this.cashBalance;
    this.templateOrders.push(this.cartService.buildOrder(stock, 1, 1, this.addOrderFormGroup.value.side, 'MACHINE'));

    this.errorMsg = '';
  }

  getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = _.round(total * allocationPct, 2);
    return _.floor(totalCost / stockPrice);
  }

  delete(event) {
    const foundIdx = this.templateOrders.findIndex((val) => {
      if (val.holding.symbol === event) {
        return true;
      }
      return false;
    });

    this.templateOrders.splice(foundIdx, 1);
  }

  addSelectedList() {
    this.templateOrders.forEach((order: SmartOrder) => {
      this.cartService.addToCart(order);
    });
    this.display = false;
  }

  setAddOrderForm() {
    let defaultSide = 'Buy';
    let defaultSymbol = '';
    if (this.prefillOrderForm) {
      defaultSide = this.prefillOrderForm.side;
      defaultSymbol = this.prefillOrderForm.holding.symbol;
    }
    const initAllocation = 1;
    this.addOrderFormGroup = this._formBuilder.group({
      allocation: [initAllocation, Validators.required],
      symbol: [defaultSymbol, Validators.required],
      side: [defaultSide, Validators.required]
    });
  }

  onShow() {
    if (this.prefillOrderForm) {
      this.addOrderFormGroup = this._formBuilder.group({
        allocation: [1, Validators.required],
        symbol: [this.prefillOrderForm.holding.symbol, Validators.required],
        side: [this.prefillOrderForm.side, Validators.required]
      });
    }
    this.getPortfolioTotal();
  }

  onHide() {
    this.display = false;
  }

  updatedAmount(query: number) {
    this.amountChange.next(query);
  }

  getPortfolioTotal() {
    this.isLoading = true;
    this.machineDaytradingService.getPortfolioBalance()
      .subscribe((data) => {
        const spendBalance = data.liquidationValue - data.longMarketValue;
        this.updatedAmount(spendBalance);
        this.isLoading = false;
      }, () => {
        this.isLoading = false;
      });
  }

  createDefaultList() {
    const daytradeList = sessionStorage.getItem('daytradeList');
    if (daytradeList) {
      const storedList: SmartOrder[] = JSON.parse(sessionStorage.getItem('daytradeList'));

      const retrievedList = storedList.reduce((accumulator, currentValue) => {
        if (currentValue) {
          const newItem = {
            label: currentValue.holding.symbol,
            allocation: this.addOrderFormGroup.value.allocation,
            side: currentValue.side
          };
          accumulator.push(newItem);
        }
        return accumulator;
      }, []);
      return retrievedList;
    }
    return [
      {
        label: 'TQQQ',
        allocation: 1,
        side: 'Buy'
      }
    ];
  }

  addItem() {
    console.log(this.selectedDefaultOrders);
    this.selectedDefaultOrders.forEach(tableRow => {
      this.addOrder(tableRow.label, tableRow.allocation, this.cashBalance, tableRow.side);
    });
  }

  filterItems(event) {
    console.log('filterItrems', event, this.symbolsQuery);
    this.suggestionsArr = [
      { label: event.query, value: event.query }
    ];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

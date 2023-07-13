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
import { SelectItem } from 'primeng/api';

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
  firstFormGroup: FormGroup;
  addOrderFormGroup: FormGroup;
  selectedDefaultOrders = [];
  private amountChange = new Subject<string>();
  isLoading = false;
  sides: SelectItem[];
  errorMsg: string;
  destroy$ = new Subject();
  symbolsForm: FormGroup;
  defaultAllocations = [{ name: '0.05', value: 0.05 },
  { name: '0.25', value: 0.25 },
  { name: '0.5', value: 0.5 },
  { name: '1', value: 1 }];

  selectedAllocation = { name: '0.25', value: 0.25 };
  balanceOptions = [
    { label: 'Cash Balance', value: 'cashBal' },
    { label: 'Portfolio Total', value: 'portTotal' }
  ];

  cashBalanceOption = 'portTotal';

  constructor(private _formBuilder: FormBuilder,
    private cartService: CartService,
    private schedulerService: SchedulerService,
    private machineDaytradingService: MachineDaytradingService) { }

  ngOnInit() {
    this.display = false;
    this.hideButton = false;
    this.templateOrders = [];

    this.symbolsForm = this._formBuilder.group({
      list: ''
    });

    this.amountChange
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.firstFormGroup.controls['amount'].setValue(value);
      });

    this.sides = [
      { label: 'Buy', value: 'Buy' },
      { label: 'Sell', value: 'Sell' },
      { label: 'DayTrade', value: 'DayTrade' }
    ];

    this.firstFormGroup = this._formBuilder.group({
      amount: [1000, Validators.required]
    });

    this.setAddOrderForm();

    this.defaultLists = this.createDefaultList();
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
    const stockListText = this.symbolsForm.value.list.trim().toUpperCase().split(',');
    stockListText.forEach(textSymbol => {
      const allocationPct = this.addOrderFormGroup.value.allocation;
      const total = this.firstFormGroup.value.amount;
      this.addOrder(textSymbol, allocationPct, total);
    });
  }

  changedSelection() {
    this.templateOrders = [];
    this.defaultLists.forEach((allocationItem) => {
      if (allocationItem.allocation > 0) {
        const stock = allocationItem.label;
        const allocationPct = allocationItem.allocation;
        const total = this.firstFormGroup.value.amount;
        const side = allocationItem.side;
        this.addOrder(stock, allocationPct, total, side);
      }
    });
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
      const total = this.firstFormGroup.value.amount;
      this.addOrder(stock, allocationPct, total);

      this.errorMsg = '';
    } else {
      this.errorMsg = 'Please fix errors.';
    }
  }

  addMachineTrade() {
    const stock = 'MACHINE';
    this.machineDaytradingService.allocationPct = this.addOrderFormGroup.value.allocation;
    this.machineDaytradingService.allocationTotal = this.firstFormGroup.value.amount;
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

  updatedAmount(query: string) {
    this.amountChange.next(query);
  }

  getBalance() {
    console.log(this.cashBalanceOption);
    if (this.cashBalanceOption === 'cashBal') {
      this.getCashBalance();
    } else {
      this.getPortfolioTotal();
    }
  }

  getPortfolioTotal() {
    this.isLoading = true;
    this.machineDaytradingService.getPortfolioBalance()
      .subscribe((data) => {
        this.updatedAmount(data.liquidationValue);
        this.isLoading = false;
      }, () => {
        this.isLoading = false;
      });
  }

  getCashBalance() {
    this.isLoading = true;
    this.machineDaytradingService.getPortfolioBalance().subscribe((data) => {
      this.updatedAmount(data.cashBalance || data.cashAvailableForTrading);
      this.isLoading = false;
    }, () => {
      this.isLoading = false;
    });
  }

  saveToStorage(templateOrders: SmartOrder[]) {
    sessionStorage.removeItem('daytradeList');
    const ordersToSave = templateOrders.reduce((acc, val: SmartOrder) => {
      if (!acc.uniqueSymbols[val.holding.symbol]) {
        acc.uniqueSymbols[val.holding.symbol] = true;
        acc.list.push(val);
      }
      return acc;
    }, { uniqueSymbols: {}, list: [] }).list;
    sessionStorage.setItem('daytradeList', JSON.stringify(ordersToSave));
    this.defaultLists = this.createDefaultList();
    console.log('default list set to ', this.defaultLists);
  }

  createDefaultList() {
    const daytradeList = sessionStorage.getItem('daytradeList');
    if (daytradeList) {
      const storedList: SmartOrder[] = JSON.parse(sessionStorage.getItem('daytradeList'));

      const retrievedList = storedList.reduce((accumulator, currentValue) => {
        if (currentValue) {
          const newItem = {
            label: currentValue.holding.symbol,
            allocation: this.selectedAllocation.value || 0.25,
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

  updateDefaultList () {
    const allocation = this.selectedAllocation;
    this.defaultLists.forEach(defaultItem => {
      defaultItem.allocation = allocation.value*1;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

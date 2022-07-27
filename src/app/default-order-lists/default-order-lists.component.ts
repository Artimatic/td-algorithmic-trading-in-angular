import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SelectItem } from 'primeng/components/common/selectitem';
import { SmartOrder } from '../shared/models/smart-order';
import { PortfolioService } from '../shared';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import * as _ from 'lodash';
import { CartService } from '../shared/services/cart.service';
import { Order } from '../shared/models/order';
import { Subject } from 'rxjs';
import {
  debounceTime, distinctUntilChanged
} from 'rxjs/operators';
import { MachineDaytradingService } from '../machine-daytrading/machine-daytrading.service';

@Component({
  selector: 'app-default-order-lists',
  templateUrl: './default-order-lists.component.html',
  styleUrls: ['./default-order-lists.component.scss']
})
export class DefaultOrderListsComponent implements OnInit, OnChanges {
  @Input() display: boolean;
  @Input() hideButton: boolean;
  @Input() prefillOrderForm: Order;
  defaultLists: SelectItem[];
  templateOrders: SmartOrder[];
  selectedList;
  firstFormGroup: FormGroup;
  addOrderFormGroup: FormGroup;
  private amountChange = new Subject<string>();
  isLoading = false;
  sides: SelectItem[];
  errorMsg: string;

  constructor(private _formBuilder: FormBuilder,
    private portfolioService: PortfolioService,
    private cartService: CartService,
    private machineDaytradingService: MachineDaytradingService) { }

  ngOnInit() {
    this.display = false;
    this.hideButton = false;
    this.templateOrders = [];

    this.amountChange
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(value => {
        this.firstFormGroup.controls['amount'].setValue(value);
        this.changedSelection(this.selectedList);
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

    this.defaultLists = [
      { label: 'Choose a List', value: null },
      { label: 'CUSTOM', value: [] },
      {
        label: 'UPRO60 TMF40',
        value: [
          { stock: 'UPRO', allocation: 0.60 },
          { stock: 'TMF', allocation: 0.40 }
        ]
      },
      {
        label: 'SPXU35 SQQQ20 TMV45',
        value: [
          { stock: 'SPXU', allocation: 0.35 },
          { stock: 'SQQQ', allocation: 0.20 },
          { stock: 'TMV', allocation: 0.45 }
        ]
      },
      {
        label: 'UPRO35 TQQQ20 TMF45',
        value: [
          { stock: 'UPRO', allocation: 0.35 },
          { stock: 'TQQQ', allocation: 0.20 },
          { stock: 'TMF', allocation: 0.45 }
        ]
      },
      {
        label: 'TQQQ50 TMF50', value: [
          { stock: 'TQQQ', allocation: 0.50 },
          { stock: 'TMF', allocation: 0.50 }
        ]
      },
      {
        label: 'MSFT90 VXX10', value: [
          { stock: 'MSFT', allocation: 0.90 },
          { stock: 'VXX', allocation: 0.10 }
        ]
      },
      {
        label: 'AMZN90 VXX10', value: [
          { stock: 'AMZN', allocation: 0.90 },
          { stock: 'VXX', allocation: 0.10 }
        ]
      },
      {
        label: 'NFLX90 VXX10', value: [
          { stock: 'NFLX', allocation: 0.90 },
          { stock: 'VXX', allocation: 0.10 }
        ]
      },
      {
        label: 'FB90 VXX10', value: [
          { stock: 'FB', allocation: 0.90 },
          { stock: 'VXX', allocation: 0.10 }
        ]
      },
      {
        label: 'AAPL90 VXX10', value: [
          { stock: 'AAPL', allocation: 0.90 },
          { stock: 'VXX', allocation: 0.10 }
        ]
      }
    ];

    this.selectedList = [];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.prefillOrderForm) {
      this.setAddOrderForm();
    }
  }

  showDialog() {
    this.display = true;
  }

  changedSelection(selected) {
    this.templateOrders = [];
    if (selected) {
      selected.forEach((allocationItem) => {
        const stock = allocationItem.stock;
        const allocationPct = allocationItem.allocation;
        const total = this.firstFormGroup.value.amount;
        this.addOrder(stock, allocationPct, total);
      });
    }
  }

  addOrder(stock: string, allocationPct: number, total: number) {
    if (this.addOrderFormGroup.value.side.toLowerCase() === 'sell') {
      this.portfolioService.getTdPortfolio().subscribe((data) => {
        data.forEach((holding) => {
          if (holding.instrument.symbol === stock) {
            const sellQuantity = holding.longQuantity;
            this.portfolioService.getPrice(stock).subscribe((price) => {
              this.templateOrders.push(this.cartService.buildOrder(stock, sellQuantity, price, this.addOrderFormGroup.value.side));
            });
          }
        });
      });
    } else {
      this.portfolioService.getPrice(stock).subscribe((price) => {
        const quantity = this.getQuantity(price, allocationPct, total);
        this.templateOrders.push(this.cartService.buildOrder(stock, quantity, price, this.addOrderFormGroup.value.side));
      });
    }

    const cb = (quantity, price) => {
      this.templateOrders.push(this.cartService.buildOrder(stock, quantity, price, this.addOrderFormGroup.value.side));
    };

    this.machineDaytradingService.addOrder(this.addOrderFormGroup.value.side, stock, allocationPct, total, cb);
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
    this.templateOrders.forEach((order) => {
      this.cartService.addToCart(order);
    });
    this.display = false;
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
  }

  onHide() {
    this.display = false;
  }

  updatedAmount(query: string) {
    this.amountChange.next(query);
  }

  getPortfolioTotal() {
    this.isLoading = true;
    this.machineDaytradingService.getPortfolioBalance().subscribe((data) => {
      this.updatedAmount(data.liquidationValue);
      this.isLoading = false;
    });
  }

  getCashBalance() {
    this.isLoading = true;
    this.machineDaytradingService.getPortfolioBalance().subscribe((data) => {
      this.updatedAmount(data.cashBalance || data.cashAvailableForTrading);
      this.isLoading = false;
    });
  }
}

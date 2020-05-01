import { Component, OnInit } from '@angular/core';
import { SelectItem } from 'primeng/components/common/selectitem';
import { SmartOrder } from '../shared/models/smart-order';
import { PortfolioService } from '../shared';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import * as _ from 'lodash';
import { CartService } from '../shared/services/cart.service';

@Component({
  selector: 'app-default-order-lists',
  templateUrl: './default-order-lists.component.html',
  styleUrls: ['./default-order-lists.component.css']
})
export class DefaultOrderListsComponent implements OnInit {
  display: boolean = false;
  defaultLists: SelectItem[];
  templateOrders: SmartOrder[];
  selectedList;
  firstFormGroup: FormGroup;

  constructor(private _formBuilder: FormBuilder,
    private portfolioService: PortfolioService,
    private cartService: CartService) { }

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      amount: [1000, Validators.required],
      symbol: []
    });

    this.defaultLists = [
      { label: 'Select List', value: null },
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
        label: 'SPXU35 SQQQ20 TMV45',
        value: [
          { stock: 'SPXU', allocation: 0.35 },
          { stock: 'SQQQ', allocation: 0.20 },
          { stock: 'TMV', allocation: 0.45 }
        ]
      },
    ];

    this.selectedList = [];
  }

  showDialog() {
    this.display = true;
  }

  changedSelection(selected) {
    this.templateOrders = [];
    selected.forEach((allocationItem) => {
      const stock = allocationItem.stock;
      const allocationPct = allocationItem.allocation;
      const total = this.firstFormGroup.value.amount;
      this.getQuote(stock).subscribe((price) => {
        const quantity = this.getQuantity(price, allocationPct, total);
        this.templateOrders.push(this.buildOrder(stock, quantity, price));
      });
    });
  }

  getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = _.round(total * allocationPct, 2);
    return _.floor(totalCost / stockPrice);
  }

  buildOrder(symbol: string, quantity = 0, price = 0): SmartOrder {
    return {
      holding: {
        instrument: null,
        symbol,
      },
      quantity,
      price,
      submitted: false,
      pending: false,
      orderSize: _.floor(quantity / 2) || 1,
      side: 'Buy',
    };
  }

  delete(event) {
    console.log('delete: ', event);
  }

  getQuote(symbol: string) {
    return this.portfolioService.getPrice(symbol);
  }

  addSelectedList() {
    this.templateOrders.forEach((order) => {
      this.cartService.addToCart(order);
    });
    this.display = false;
  }
}

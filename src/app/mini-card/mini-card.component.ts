import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { PortfolioService } from '../shared';
import * as _ from 'lodash';

@Component({
  selector: 'app-mini-card',
  templateUrl: './mini-card.component.html',
  styleUrls: ['./mini-card.component.scss']
})
export class MiniCardComponent implements OnInit {
  @Input() order: SmartOrder;
  @Input() canEdit: boolean;
  @Output() delete: EventEmitter<any> = new EventEmitter();
  @Output() updatedOrder: EventEmitter<SmartOrder> = new EventEmitter();
  firstFormGroup: FormGroup;
  changeText;
  detailMode: boolean;
  actionMode: boolean;
  editMode: boolean;

  constructor(private _formBuilder: FormBuilder, private portfolioService: PortfolioService) { }

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      amount: [this.order.amount, Validators.required]
    });

    this.setDetailMode();
  }

  deleteCard() {
    this.delete.emit(this.order.holding.symbol);
  }

  setDetailMode() {
    this.detailMode = true;
    this.editMode = false;
    this.actionMode = false;
  }

  setEditMode() {
    this.detailMode = false;
    this.editMode = true;
    this.actionMode = false;
  }

  setActionMode() {
    this.detailMode = false;
    this.editMode = false;
    this.actionMode = true;
  }

  editCard() {
    this.setEditMode();
  }

  saveEdit() {
    this.setDetailMode();
    const totalAmount = this.firstFormGroup.value.amount;
    if (totalAmount > 0) {
      this.portfolioService.getPrice(this.order.holding.symbol)
      .subscribe((stockPrice) => {
        const quantity = _.floor(totalAmount / stockPrice);
        this.order.amount = Number(this.firstFormGroup.value.amount);
        this.order.quantity = quantity;
        this.order.orderSize = _.floor(quantity / 3) || 1;
        this.updatedOrder.emit(this.order);
      });
    }
  }

  cancelEdit() {
    this.setDetailMode();
  }

  mouseIn() {
    if (!this.editMode) {
      this.setActionMode();
    }
  }

  mouseOut() {
    if (!this.editMode) {
      this.setDetailMode();
    }
  }
}

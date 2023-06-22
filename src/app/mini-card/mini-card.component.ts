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

  constructor(private _formBuilder: FormBuilder, private portfolioService: PortfolioService) { }

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      amount: [this.order.amount, Validators.required]
    });
  }

  deleteCard() {
    this.delete.emit(this.order.holding.symbol);
  }
}

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

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

  constructor(private _formBuilder: FormBuilder) { }

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      amount: [this.order.amount || 1000, Validators.required]
    });

    this.setDetailMode();
  }

  deleteCard() {
    this.delete.emit();
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
    this.order.amount = this.firstFormGroup.value.amount;
    this.updatedOrder.emit(this.order);
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

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SmartOrder } from '../shared/models/smart-order';

@Component({
  selector: 'app-mini-card',
  templateUrl: './mini-card.component.html',
  styleUrls: ['./mini-card.component.css']
})
export class MiniCardComponent implements OnInit {
  @Input() order: SmartOrder;
  @Output() delete: EventEmitter<any> = new EventEmitter();

  constructor() { }

  ngOnInit() {
  }

  deleteCard() {
    this.delete.emit();
  }
}

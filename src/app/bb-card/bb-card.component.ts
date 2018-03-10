import { Component, OnInit, EventEmitter, Input } from '@angular/core';
import { BacktestService } from '../shared';

@Component({
  selector: 'app-bb-card',
  templateUrl: './bb-card.component.html',
  styleUrls: ['./bb-card.component.css']
})
export class BbCardComponent implements OnInit {
  @Input() order: any;

  constructor(private backtestService: BacktestService) { }

  ngOnInit() {
  }

}

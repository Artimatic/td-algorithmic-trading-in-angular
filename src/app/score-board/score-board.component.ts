import { Component, OnChanges, Input, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import { SmartOrder } from '../shared/models/smart-order';

@Component({
  selector: 'app-score-board',
  templateUrl: './score-board.component.html',
  styleUrls: ['./score-board.component.css']
})
export class ScoreBoardComponent implements OnChanges {
  @Input() stock: string;
  @Input() score: number;

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.score) {
      this.score = changes.score.currentValue;
    }
  }
}

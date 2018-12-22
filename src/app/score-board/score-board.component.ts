import { Component, OnChanges, Input, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-score-board',
  templateUrl: './score-board.component.html',
  styleUrls: ['./score-board.component.css']
})
export class ScoreBoardComponent implements OnChanges {
  @Input() title: string;
  @Input() score: number;

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.score) {
      this.score = changes.score.currentValue;
    }
  }
}

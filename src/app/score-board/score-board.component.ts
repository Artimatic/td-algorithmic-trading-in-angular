import { Component, OnInit, Input } from '@angular/core';
import * as _ from 'lodash';
import { SmartOrder } from '../shared/models/smart-order';

@Component({
  selector: 'app-score-board',
  templateUrl: './score-board.component.html',
  styleUrls: ['./score-board.component.css']
})
export class ScoreBoardComponent implements OnInit {
  @Input() score: any;

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: any) {
    console.log('changes: ', changes);

  }

}

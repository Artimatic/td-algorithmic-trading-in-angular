import { Component, OnChanges, SimpleChanges, Input, OnInit } from '@angular/core';
import { Order } from '../shared/models/order';
import { ScoreKeeperService } from '../shared';

@Component({
  selector: 'app-daytrade-score-board',
  templateUrl: './daytrade-score-board.component.html',
  styleUrls: ['./daytrade-score-board.component.css']
})
export class DaytradeScoreBoardComponent implements OnChanges, OnInit {
  @Input() buyOrders: Order[];
  @Input() otherOrders: Order[];
  @Input() totalScore: number;
  scoreTable;

  constructor(private scoreKeeperService: ScoreKeeperService) { }

  ngOnInit() {
    this.scoreTable = [];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.totalScore) {
      this.getScores();
    }
  }

  getScores() {
    this.buyOrders.forEach((order) => {
      const tableItem = {
        stock: order.holding.symbol,
        profit: this.scoreKeeperService.profitLossHash[order.holding.symbol]
      };
      this.scoreTable.push(tableItem);
    });

    this.otherOrders.forEach((order) => {
      const tableItem = {
        stock: order.holding.symbol,
        profit: this.scoreKeeperService.profitLossHash[order.holding.symbol]
      };
      this.scoreTable.push(tableItem);
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { Message } from 'primeng';
import { stockList } from '../rh-table/backtest-stocks.constant';
import { PortfolioService } from '@shared/services';
import { GlobalTaskQueueService } from '@shared/services/global-task-queue.service';

@Component({
  selector: 'app-stocklist',
  templateUrl: './stocklist.component.html',
  styleUrls: ['./stocklist.component.css']
})
export class StocklistComponent implements OnInit {
  messages: Message[] = [];
  cleanList: string[] = [];
  constructor(private portfolioService: PortfolioService,
    private globalTaskQueueService: GlobalTaskQueueService) { }

  ngOnInit() {
  }

  removeStock(stock: string) {
    this.messages.push({ severity: 'info', summary: stock, detail: 'Removed' });
  }

  isInvalidStock(stock, price) {
    if (price < 15) {
      return true;
    }

    const foundIdx = this.cleanList.findIndex((value) => value === stock);

    if (foundIdx !== -1) {
      return true;
    }
  }

  addStock(stock: string) {
    this.cleanList.push(stock);
  }

  async cleanStockList() {
    for (const stock of stockList) {
      const getPrice = (price) => {
        if (this.isInvalidStock(stock, price)) {
          this.removeStock(stock);
        } else {
          this.addStock(stock);
        }
      };
      this.globalTaskQueueService.addTask(this.portfolioService.getPrice(stock), getPrice, () => { });
    }
  }
}

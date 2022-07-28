import { Injectable } from '@angular/core';
import { SchedulerService } from '@shared/service/scheduler.service';
import * as moment from 'moment-timezone';
import * as _ from 'lodash';

import { BacktestService, MachineLearningService, PortfolioService } from '@shared/services';
import Stocks from '../rh-table/backtest-stocks.constant';
import { GlobalSettingsService } from '../settings/global-settings.service';

@Injectable({
  providedIn: 'root'
})
export class MachineDaytradingService {
  public selectedStock = null;
  public quantity = 0;
  public orderSize = 0;


  constructor(private schedulerService: SchedulerService,
    private backtestService: BacktestService,
    private globalSettingsService: GlobalSettingsService,
    private portfolioService: PortfolioService,
    private machineLearningService: MachineLearningService) { }

  findTrade() {
    this.schedulerService.schedule(() => {
      const stock = this.getRandomStock();
      this.backtestService.getDaytradeRecommendation(stock, 0, 0, { minQuotes: 81 }).subscribe(
        analysis => {
          if (analysis.recommendation.toLowerCase() === 'buy') {
            this.schedulerService.schedule(() => {
              this.machineLearningService
                .trainPredictNext30(stock,
                  moment().add({ days: 1 }).format('YYYY-MM-DD'),
                  moment().subtract({ days: 1 }).format('YYYY-MM-DD'),
                  1,
                  this.globalSettingsService.daytradeAlgo
                )
                .subscribe((data: any[]) => {
                  if (data[0].nextOutput > 0.5 && data[0].correct / data[0].guesses > 0.5) {
                    const cb = (quantity) => {
                      this.selectedStock = stock;
                      this.quantity = quantity;
                      this.orderSize = _.floor(quantity / 3) || 1;
                    };

                    console.log('Found a trade: ', stock);
                    this.schedulerService.schedule(() => {
                      this.getPortfolioBalance().subscribe((total) => {
                        this.addOrder('daytrade', stock, 1, total, cb);
                      });
                    }, 'MachineDaytradingService_add_order', this.globalSettingsService.stopTime, false);

                  } else {
                    this.resetStock();
                  }
                });
            }, 'MachineDaytradingService_ml', this.globalSettingsService.stopTime, false);
          } else {
            this.resetStock();
          }
        }
      );
    }, 'MachineDaytradingService_get_recommendation', this.globalSettingsService.stopTime);
  }

  getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = _.round(total * allocationPct, 2);
    return _.floor(totalCost / stockPrice);
  }

  addOrder(orderType: string, stock: string, allocationPct: number, total: number, cb: (arg1: number, arg2: number) => void) {
    if (orderType.toLowerCase() === 'sell') {
      this.portfolioService.getTdPortfolio().subscribe((data) => {
        data.forEach((holding) => {
          if (holding.instrument.symbol === stock) {
            const sellQuantity = holding.longQuantity;
            this.portfolioService.getPrice(stock).subscribe((price) => {
              cb(sellQuantity, price);
            });
          }
        });
      });
    } else {
      this.schedulerService.schedule(() => {
        this.portfolioService.getPrice(stock).subscribe((price) => {
          const quantity = this.getQuantity(price, allocationPct, total);
          cb(quantity, price);
        });
      }, 'MachineDaytradingService_get_quantity', this.globalSettingsService.stopTime);
    }
  }


  getRandomStock(): string {
    const randomIdx = Math.floor(Math.random() * Stocks.length);
    return Stocks[randomIdx].ticker;
  }

  resetStock() {
    this.selectedStock = null;
  }

  getPortfolioBalance() {
    return this.portfolioService.getTdBalance();
  }

  isBalanceSufficient(orderCost: number) {
    return this.portfolioService.getTdBalance().subscribe(data => {
      if (data.cashBalance > orderCost || data.cashAvailableForTrading > orderCost) {
        return true;
      }
      return false;
    });
  }
}

import { Injectable } from '@angular/core';
import { SchedulerService } from '@shared/service/scheduler.service';
import * as moment from 'moment-timezone';
import * as _ from 'lodash';

import { BacktestService, MachineLearningService, PortfolioService } from '@shared/services';
import Stocks from '../rh-table/backtest-stocks.constant';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MachineDaytradingService {
  public selectedStock = null;
  public quantity = 0;
  public orderSize = 0;
  public allocationPct = null;
  public allocationTotal = null;
  public lastBalance = null;

  constructor(private schedulerService: SchedulerService,
    private backtestService: BacktestService,
    private globalSettingsService: GlobalSettingsService,
    private portfolioService: PortfolioService,
    private machineLearningService: MachineLearningService) { }

  trainStock(stock: string) {
    this.schedulerService.schedule(() => {
      this.machineLearningService
        .trainPredictNext30(stock,
          moment().add({ days: 1 }).format('YYYY-MM-DD'),
          moment().subtract({ days: 1 }).format('YYYY-MM-DD'),
          1,
          this.globalSettingsService.daytradeAlgo
        ).subscribe();
    }, 'MachineDaytradingService_ml', null, false, 300000);
  }

  findTrade() {
    this.schedulerService.schedule(() => {
      if (!this.selectedStock) {
        const stock = this.getRandomStock();
        this.backtestService.getDaytradeRecommendation(stock, 0, 0, { minQuotes: 81 }, 'tiingo').subscribe(
          analysis => {
            if (analysis.mfiTrade.toLowerCase() === 'bullish' || analysis.vwma.toLowerCase() === 'bullish') {
              this.schedulerService.schedule(() => {
                this.machineLearningService
                  .trainPredictNext30(stock,
                    moment().add({ days: 1 }).format('YYYY-MM-DD'),
                    moment().subtract({ days: 1 }).format('YYYY-MM-DD'),
                    1,
                    this.globalSettingsService.daytradeAlgo
                  )
                  .subscribe((data: any[]) => {
                    // if (data[0].nextOutput > 0.5 && data[0].correct / data[0].guesses > 0.5) {
                    if (data[0].correct / data[0].guesses > 0.6 && data[0].guesses > 50) {
                      const cb = (quantity) => {
                        this.selectedStock = stock;
                        this.quantity = quantity;
                        this.orderSize = _.floor(quantity / 3) || 1;
                        console.log('Set trade: ', stock, this.quantity, this.orderSize);
                      };

                      console.log('Found a trade: ', stock);

                      if (this.allocationTotal !== null && this.allocationPct !== null) {
                        console.log('Adding trade 1: ', stock);
                        this.addOrder('daytrade', stock, this.allocationPct, this.allocationTotal, cb, analysis.data.price);
                      } else {
                        this.schedulerService.schedule(() => {
                          this.getPortfolioBalance().subscribe(balance => {
                            console.log('Adding trade 2: ', stock);
                            this.addOrder('daytrade', stock, 1, balance.availableFunds, cb, analysis.data.price);
                          });
                        }, 'MachineDaytradingService_add_order', this.globalSettingsService.stopTime, true);
                      }
                    }
                  });
              }, 'MachineDaytradingService_ml', this.globalSettingsService.stopTime);
            }
          }
        );
      }
    }, 'MachineDaytradingService_get_recommendation', this.globalSettingsService.stopTime);
  }

  getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = _.round(total * allocationPct, 2);
    return _.floor(totalCost / stockPrice);
  }

  addOrder(orderType: string, stock: string, allocationPct: number, total: number, cb: (arg1: number, arg2: number) => void, lastPrice, reject = err => {}) {
    if (orderType.toLowerCase() === 'sell') {
      this.portfolioService.getTdPortfolio().subscribe((data) => {
        data.forEach((holding) => {
          if (holding.instrument.symbol === stock) {
            const sellQuantity = holding.longQuantity;
            if (!lastPrice) {
              this.portfolioService.getPrice(stock).subscribe((price) => {
                cb(sellQuantity, price);
              });
            } else {
              cb(sellQuantity, lastPrice);
            }
          }
        });
      }, err => reject(err.error.error));
    } else {
      if (!lastPrice) {
        this.portfolioService.getPrice(stock).subscribe((price) => {
          const quantity = this.getQuantity(price, allocationPct, total);
          cb(quantity, price);
        }, err => reject(err.error.error));
      } else {
        const quantity = this.getQuantity(lastPrice, allocationPct, total);
        cb(quantity, lastPrice);
      }
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
    return this.portfolioService.getTdBalance().pipe(tap(total => this.lastBalance = total));
  }

  isBalanceSufficient(orderCost: number) {
    return this.getPortfolioBalance().subscribe(data => {
      if (data.cashBalance > orderCost || data.cashAvailableForTrading > orderCost) {
        return true;
      }
      return false;
    });
  }
}

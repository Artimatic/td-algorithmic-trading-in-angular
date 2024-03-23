import { Injectable } from '@angular/core';
import { SchedulerService } from '@shared/service/scheduler.service';
import * as moment from 'moment-timezone';
import * as _ from 'lodash';

import { BacktestService, MachineLearningService, PortfolioService } from '@shared/services';
import{ CurrentStockList } from '../rh-table/stock-list.constant';
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
  private counter = 0;
  private currentStockList = null;

  constructor(private schedulerService: SchedulerService,
    private backtestService: BacktestService,
    private globalSettingsService: GlobalSettingsService,
    private portfolioService: PortfolioService,
    private machineLearningService: MachineLearningService) { }

  async trainStock(stock: string, startDate: string, endDate: string) {
    return this.machineLearningService
      .trainDaytrade(stock,
        endDate,
        startDate,
        1,
        this.globalSettingsService.daytradeAlgo
      ).toPromise();
  }

  findSingleDaytrade(stockSymbol, stopTime = null, mainCallback = (stock, quantity, price) => { }) {
    if (!stockSymbol) {
      stockSymbol = this.getNextStock();
    }
    this.backtestService.getDaytradeRecommendation(stockSymbol, 0, 0, { minQuotes: 81 }, 'tiingo').subscribe(
      analysis => {
        if (analysis.recommendation.toLowerCase() === 'buy') {
          this.schedulerService.schedule(() => {
            this.machineLearningService
              .trainDaytrade(stockSymbol,
                moment().add({ days: 1 }).format('YYYY-MM-DD'),
                moment().subtract({ days: 1 }).format('YYYY-MM-DD'),
                1,
                this.globalSettingsService.daytradeAlgo
              )
              .subscribe((data: any[]) => {
                if (data[0].correct / data[0].guesses > 0.6 && data[0].guesses > 50) {
                  const cb = (quantity, price) => {
                    this.selectedStock = stockSymbol;
                    this.quantity = quantity;
                    this.orderSize = _.floor(quantity / 3) || 1;
                    console.log('Set trade: ', stockSymbol, this.quantity, this.orderSize);
                    mainCallback(stockSymbol, quantity, price);
                  };
                  if (this.allocationTotal !== null && this.allocationPct !== null) {
                    this.addOrder('daytrade', stockSymbol, this.allocationPct, this.allocationTotal, cb, analysis.data.price);
                  } else {
                    this.schedulerService.schedule(() => {
                      this.getPortfolioBalance().subscribe(balance => {
                        this.addOrder('daytrade', stockSymbol, 1, balance.availableFunds, cb, analysis.data.price);
                      });
                    }, 'MachineDaytradingService_add_order', stopTime, true);
                  }
                } else {
                  mainCallback(null, null, null);
                }
              }, () => {
                mainCallback(null, null, null);
              });
          }, 'MachineDaytradingService_ml', stopTime);
        } else {
          mainCallback(null, null, null);
        }
      }, () => {
        mainCallback(null, null, null);
      }
    );
  }

  findTrade() {
    this.schedulerService.schedule(() => {
      if (!this.selectedStock) {
        this.findSingleDaytrade(null, this.globalSettingsService.stopTime);
      }
    }, 'MachineDaytradingService_get_recommendation', this.globalSettingsService.stopTime);
  }

  getQuantity(stockPrice: number, allocationPct: number, total: number) {
    const totalCost = _.round(total * allocationPct, 2);
    return _.floor(totalCost / stockPrice);
  }

  addOrder(orderType: string, stock: string, allocationPct: number, total: number, cb: (arg1: number, arg2: number) => void, lastPrice, reject = err => { }) {
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

  setCurrentStockList(stockList) {
    this.currentStockList = stockList;
    this.resetStockCounter();
  }

  getNextStock() {
    if (!this.currentStockList) {
      this.currentStockList = CurrentStockList;
    }
    this.counter++;
    if (this.counter > this.currentStockList.length - 1) {
      this.counter = 0;
    }
    return this.currentStockList[this.counter].ticker ? this.currentStockList[this.counter].ticker : this.currentStockList[this.counter].name;
  }

  resetStockCounter() {
    this.counter = 0;
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

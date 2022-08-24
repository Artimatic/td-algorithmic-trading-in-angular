import { Component, OnInit, OnDestroy } from '@angular/core';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material';
import { FormGroup, FormBuilder } from '@angular/forms';
import { BacktestService, MachineLearningService, PortfolioService } from '../../shared/index';
import IntradayStocks from '../../intraday-backtest-view/intraday-backtest-stocks.constant';
import { Subscription, Subject, of } from 'rxjs';
import { GlobalSettingsService } from '../../settings/global-settings.service';
import * as _ from 'lodash';
import { CartService } from '../../shared/services/cart.service';
import { map, take, tap } from 'rxjs/operators';
import { SchedulerService } from '@shared/service/scheduler.service';

export interface TrainingResults {
  symbol?: string;
  algorithm?: string;
  guesses: number;
  correct: number;
  score: number;
  nextOutput: number;
}

@Component({
  selector: 'app-ask-model',
  templateUrl: './ask-model.component.html',
  styleUrls: ['./ask-model.component.css']
})
export class AskModelComponent implements OnInit, OnDestroy {
  public startDate: Date;
  public endDate: Date;
  form: FormGroup;
  symbol = 'SPY';
  isLoading: boolean;
  selectedModel: any;
  models: any[];
  cols: any[];
  intradayMlCols: any[];
  modelResults: TrainingResults[];
  intradayMlResults: any[];
  selectedStock;
  prefillOrderForm;
  stockList: string[] = [];
  private callChainSub: Subscription;
  private backtestBuffer: { stock: string }[];
  private bufferSubject: Subject<void>;
  private calibrationBuffer: { stock: string; features: number[]; idx?: number }[];
  private featureListScoring;

  constructor(
    private _formBuilder: FormBuilder,
    private backtestService: BacktestService,
    private machineLearningService: MachineLearningService,
    private globalSettingsService: GlobalSettingsService,
    private portfolioService: PortfolioService,
    private cartService: CartService,
    private schedulerService: SchedulerService,
    public snackBar: MatSnackBar) { }

  ngOnInit() {
    this.callChainSub = new Subscription();
    this.bufferSubject = new Subject();
    this.backtestBuffer = [];
    this.calibrationBuffer = [];

    this.featureListScoring = {};

    this.endDate = new Date();

    this.form = this._formBuilder.group({
      query: this.symbol,
      customSettings: ''
    });

    this.models = [
      { name: 'Calibrate intraday model', code: 'calibrate' },
      { name: 'Calibrate daily model', code: 'calibrate_daily' },
      { name: 'Calibrate Open Price Up model', code: 'open_price_up' },
      { name: 'Calibrate Next 30 minutes model', code: 'predict_30' }
    ];

    this.cols = [
      { field: 'symbol', header: 'Stock' },
      { field: 'algorithm', header: 'Algorithm' },
      { field: 'guesses', header: 'Guesses' },
      { field: 'correct', header: 'Correct' },
      { field: 'score', header: 'Score', type: 'percent' },
      { field: 'nextOutput', header: 'Next Output' }
    ];

    this.intradayMlCols = [
      { field: 'date', header: 'Date' },
      { field: 'close', header: 'Price' },
      { field: 'nextOutput', header: 'Next Guess' }
    ];

    this.modelResults = [];
    this.intradayMlResults = [];
    this.isLoading = false;
    this.setStartDate();
    this.selectedModel = this.models[0];
  }

  setStartDate() {
    const start = moment(this.endDate).subtract({ day: 1 });
    const day = start.day();
    if (day === 6) {
      this.startDate = start.subtract({ day: 1 }).toDate();
    } else if (day === 7) {
      this.startDate = start.subtract({ day: 1 }).toDate();
    } else if (day === 0) {
      this.startDate = start.subtract({ day: 2 }).toDate();
    } else {
      this.startDate = start.toDate();
    }
    console.log('start date: ', this.startDate);
  }

  train() {
    this.stockList = this.form.value.query.trim().toUpperCase().split(',');
    this.setStartDate();

    switch (this.selectedModel.code) {
      case 'open_price_up': {
        this.stockList.forEach(stock => {
          this.schedulerService.schedule(() => {
            this.trainOpenUp(stock);
          }, `trainOpenUp${stock}`, null, false, 180000);
        });
        break;
      }
      case 'predict_30': {
        this.stockList.forEach((stock, idx) => {
          setTimeout(() => {
            this.schedulerService.schedule(() => {
              this.trainPredict30(stock);
            }, `trainPredict30${stock}`, null, false, 180000);
          }, 10000 * idx);
        });
        break;
      }
      case 'calibrate': {
        this.stockList.forEach((stock, idx) => {
          setTimeout(() => {
            this.schedulerService.schedule(() => {
              this.calibrateOne(stock);
            }, `calibrateOne${stock}`, null, false, 180000);
          }, 10000 * idx);
        });
        break;
      }
      case 'calibrate_daily': {
        this.stockList.forEach(stock => {
          this.schedulerService.schedule(() => {
            this.calibrateDaily(stock);
          }, `calibrateDaily${stock}`, null, false, 180000);
        });
        break;
      }
    }
  }

  activate() {
    this.stockList = this.form.value.query.toUpperCase().split(',').trim();

    this.setStartDate();

    switch (this.selectedModel.code) {
      case 'open_price_up': {
        this.stockList.forEach(stock => {
          this.schedulerService.schedule(() => {
            this.activateOpenUp(stock);
          }, `activateOpenUp${stock}`);
        });

        break;
      }
      case 'calibrate_daily': {
        this.stockList.forEach(stock => {
          this.schedulerService.schedule(() => {
            this.activateDaily(stock);
          }, `activateDaily${stock}`);
        });

        break;
      }
    }
  }

  activateDaily(stock) {
    this.isLoading = true;
    const settings = this.form.value.customSettings.split(',');
    const range = settings[0] || 2;
    const limit = settings[1] || 0.003;
    console.log('setting: ', this.form.value.customSettings, settings);
    const symbol = stock;

    this.machineLearningService.activateDailyV4(symbol,
      null,
      range,
      limit)
      .pipe(take(1))
      .subscribe((data) => {
        this.isLoading = false;
        console.log('daily: ', data);
        data.algorithm = 'Daily Prediction';
        data.symbol = symbol;
        this.modelResults.push(data);
      }, error => {
        console.log('error: ', error);
        this.isLoading = false;
      });
  }

  trainOpenUp(stock) {
    this.isLoading = true;
    this.backtestService
      .runLstmV2(stock,
        moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD'),
        moment(this.startDate).format('YYYY-MM-DD')
      )
      .pipe(take(1))
      .subscribe((data: TrainingResults[]) => {
        this.isLoading = false;
        data[0].algorithm = 'Open Price Up';
        this.modelResults.push(data[0]);
      }, () => {
        this.isLoading = false;
      });
  }

  activateOpenUp(stock) {
    this.isLoading = true;

    this.backtestService.activateLstmV2(stock)
      .pipe(take(1))
      .subscribe((data) => {
        this.isLoading = false;
        data[0].algorithm = 'Open Price Up';
        this.modelResults.push(data[0]);
      }, error => {
        console.log('error: ', error);
        this.isLoading = false;
      });
  }

  trainPredict30(stock) {
    this.isLoading = true;
    this.machineLearningService
      .trainPredictNext30(stock,
        moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD'),
        moment(this.startDate).format('YYYY-MM-DD'),
        1,
        this.globalSettingsService.daytradeAlgo
      )
      .pipe(take(1))
      .subscribe((data: TrainingResults[]) => {
        this.isLoading = false;
        this.addTableItem(data);
      }, () => {
        this.isLoading = false;
      });
  }

  addTableItem(item: TrainingResults[]) {
    this.modelResults = this.modelResults.concat(item);
  }

  importRandom(count = 25) {
    const stockList = [];
    const uniqueCheck = {};
    for (let i = 0; i < count; i++) {
      let rand;
      do {
        rand = Math.floor(Math.random() * IntradayStocks.length);
      } while (uniqueCheck[rand]);
      stockList.push(IntradayStocks[rand]);
      uniqueCheck[rand] = true;
    }
    return stockList;
  }

  random() {
    this.calibrateRandom();
  }

  executeBacktests() {
    this.bufferSubject
      .subscribe(() => {
        const backtest = this.backtestBuffer[0];
        this.callChainSub.add(this.machineLearningService
          .trainPredictNext30(backtest.stock.toUpperCase(),
            moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD'),
            moment(this.startDate).format('YYYY-MM-DD'),
            1
          )
          .pipe(take(1))
          .subscribe((data: TrainingResults[]) => {
            this.isLoading = false;
            this.addTableItem(data);
            this.backtestBuffer.shift();
            this.triggerNextBacktest();
          }, () => {
            this.isLoading = false;
            setTimeout(() => {
              this.machineLearningService
                .trainPredictNext30(backtest.stock.toUpperCase(),
                  moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD'),
                  moment(this.startDate).format('YYYY-MM-DD'),
                  0
                )
                .pipe(take(1))
                .subscribe((data: TrainingResults[]) => {
                  this.isLoading = false;
                  this.addTableItem(data);
                  this.backtestBuffer.shift();
                  this.triggerNextBacktest();
                }, () => {
                  this.isLoading = false;
                  this.backtestBuffer.shift();
                  this.triggerNextBacktest();
                });

            }, 300000);

          }));
      });
    setTimeout(() => {
      this.triggerNextBacktest();
    }, 100000);

  }

  triggerNextCalibration() {
    if (this.calibrationBuffer.length > 0) {
      this.bufferSubject.next();
    }
  }

  triggerNextBacktest() {
    if (this.backtestBuffer.length > 0) {
      this.bufferSubject.next();
    }
  }

  calibrateOne(stock) {
    this.machineLearningService
      .trainPredictNext30(stock,
        moment(this.endDate).add({ days: 1 }).format('YYYY-MM-DD'),
        moment(this.startDate).format('YYYY-MM-DD'),
        0.7,
        this.globalSettingsService.daytradeAlgo
      )
      .pipe(take(1))
      .subscribe((data: any[]) => {
        this.isLoading = false;
        if (data) {
          this.addTableItem(data);
          this.collectResult(this.globalSettingsService.daytradeAlgo, data[0].score);
        }
      }, error => {
        this.isLoading = false;
      });
  }

  calibrateDaily(stock) {
    this.isLoading = true;

    const settings = this.form.value.customSettings.split(',');
    const range = settings[0] || 5;
    const limit = settings[1] || 0.003;

    console.log('setting: ', this.form.value.customSettings, settings);
    const symbol = stock;

    const endDate = this.endDate ? moment(this.endDate).add({ day: 1 }).format('YYYY-MM-DD') : moment().subtract({ day: 1 }).format('YYYY-MM-DD');
    const startDate = moment().subtract({ day: 365 }).format('YYYY-MM-DD');

    this.machineLearningService.trainPredictDailyV4(symbol,
      endDate,
      startDate,
      0.7,
      null,
      range,
      limit
    )
      .subscribe((data) => {
        console.log('training results: ', data);
        this.machineLearningService.activateDailyV4(symbol,
          null,
          range,
          limit)
          .pipe(take(1))
          .subscribe((activation) => {
            this.isLoading = false;
            data[0].nextOutput = activation.nextOutput;
            console.log('activated: ', data);
            this.addTableItem(data);
          }, error => {
            console.log('error: ', error);
            this.isLoading = false;
          });
      }, error => {
        console.log('error: ', error);
        this.isLoading = false;
      });
  }

  calibrateRandom() {
    const stocks = this.importRandom(50);
    this.calibrate(stocks);
  }

  calibrate(stocks) {
    this.setStartDate();

    this.calibrationBuffer = [];

    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
    }, 5000);

    const defaultFeatureList = [this.globalSettingsService.daytradeAlgo];

    // const defaultFeatureList = [];

    // const featureList = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // for (let i = 0; i < featureList.length - 1; i++) {
    //   featureList[i] = featureList[i] ? 0 : 1;
    //   for (let j = i + 1; j < featureList.length; j++) {
    //     featureList[j] = featureList[j] ? 0 : 1;
    //     defaultFeatureList.push(featureList.slice());
    //   }
    // }

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      defaultFeatureList.forEach((value) => {
        this.calibrationBuffer.push({ stock: stock.symbol, features: value });
      });
    }

    this.bufferSubject
      .subscribe(() => {
        const bufferItem = this.calibrationBuffer[0];

        this.callChainSub.add(this.machineLearningService
          .trainPredictNext30(bufferItem.stock.toUpperCase(),
            moment(this.endDate).add({ days: 1 }).format('YYYY-MM-DD'),
            moment(this.startDate).subtract({ days: 1 }).format('YYYY-MM-DD'),
            0.7,
            bufferItem.features
          )
          .pipe(take(1))
          .subscribe((data: any[]) => {
            this.isLoading = false;
            if (data) {
              this.addTableItem(data);
              console.log('results: ', data[0].algorithm,
                data[0].guesses, data[0].correct, data[0].score, bufferItem.features);

              this.collectResult(bufferItem.features, data[0].score);
              this.calibrationBuffer.shift();
              this.triggerNextCalibration();
            }
          }, error => {
            this.isLoading = false;

            setTimeout(() => {
              this.calibrationBuffer.shift();
              this.triggerNextCalibration();
            }, 180000);
            // let pendingResults = true;

            // TimerObservable.create(0, 60000)
            //   .takeWhile(() => pendingResults)
            //   .subscribe(() => {
            //     this.backtestService.getRnn(bufferItem.stock.toUpperCase(),
            //       moment().format('YYYY-MM-DD'),
            //       bufferItem.features)
            //       .subscribe((data: any) => {
            //         if (data) {
            //           console.log('rnn data: ', data);
            //           const converted = [{
            //             symbol: data[0].symbol,
            //             algorithm: data[0].modelName,
            //             guesses: data[0].results[0].guesses,
            //             correct: data[0].results[0].correct,
            //             score: data[0].results[0].score,
            //             nextOutput: data[0].results[0].nextOutput
            //           }];
            //           this.addTableItem(converted);
            //           pendingResults = false;

            //           this.collectResult(bufferItem.features, data[0].results[0].score);
            //           this.calibrationBuffer.shift();
            //           this.triggerNextCalibration();
            //         }
            //       }, timerError => {
            //         pendingResults = false;
            //       });
            //   });
          }));
      });

    this.triggerNextCalibration();
  }

  collectResult(featureList, score) {
    console.log('results: ', featureList, score);

    const featureListKey: string = featureList.join();
    if (score > 0.5) {
      if (this.featureListScoring[featureListKey]) {
        this.featureListScoring[featureListKey]++;
      } else {
        this.featureListScoring[featureListKey] = 1;
      }
      console.log('Score: ', this.featureListScoring);
    }
  }

  onRowSelect(event) {
    this.portfolioService.getPrice(event.data.symbol)
      .pipe(take(1))
      .subscribe((stockPrice) => {
        const amount = 1000;
        const quantity = _.floor(amount / stockPrice);
        this.prefillOrderForm = this.cartService.buildOrder(event.data.symbol, quantity, stockPrice);
      });
  }

  getIntradayQuotes() {
    this.stockList = this.form.value.query.toUpperCase().split(',').trim();

    const start = moment(this.startDate).subtract({ days: 1 }).format('YYYY-MM-DD');
    const end = moment(this.endDate).add({ days: 1 }).format('YYYY-MM-DD');
    this.stockList.forEach(stock => {
      this.schedulerService.schedule(() => {
        this.machineLearningService.getQuotes(stock, start, end)
          .pipe(
            take(1),
            map(quotes => {
              return quotes.map(quote => {
                quote.date = moment(quote.date).format('MM-DD hh:mm');
                return quote;
              });
            }))
          .subscribe(quotes => {
            console.log('quotes: ', quotes);
            this.intradayMlResults = quotes;
          });
      }, `getQuotes${stock}`);
    });
  }

  trainIntradayQuotes() {
    this.stockList = this.form.value.query.toUpperCase().split(',').trim();

    const start = moment(this.endDate).subtract({ days: 3 }).format('YYYY-MM-DD');
    const end = moment(this.endDate).add({ days: 1 }).format('YYYY-MM-DD');
    this.stockList.forEach(stock => {
      this.schedulerService.schedule(() => {
        this.machineLearningService
          .trainPredictNext30(stock,
            end,
            start,
            1,
            this.globalSettingsService.daytradeAlgo
          )
          .pipe(take(1))
          .subscribe((data: any[]) => {
          }, error => {
            console.log('daytrade ml error: ', error);
          });
      }, `trainIntradayQuotes${stock}`);
    });
  }

  activateIntradayQuotes(rowData, callback = () => { }) {
    if (rowData > 81) {
      return this.machineLearningService.getIndicators(this.intradayMlResults.slice(rowData - 81, rowData + 1))
        .pipe(take(1),
          map((indicators: any[]) => {
            console.log('indicators: ', indicators);

            return this.machineLearningService.activateModel(this.form.value.query, indicators, this.globalSettingsService.daytradeAlgo)
              .pipe(take(1))
              .subscribe(modelData => {
                this.intradayMlResults[rowData].nextOutput = modelData.nextOutput;
                callback();
              });
          })
        );
    }
    return of({}).pipe(tap(() => { callback(); }));
  }

  activateAllIntradayQuotes() {
    this.stockList.forEach(stock => {
      this.schedulerService.schedule(() => {
        this.intradayMlResults.forEach((value, idx) => {
          this.calibrationBuffer.push({ idx: idx, stock: stock, features: this.globalSettingsService.daytradeAlgo });
        });

        this.bufferSubject
          .subscribe(() => {
            const bufferItem = this.calibrationBuffer[0];

            this.callChainSub.add(this.activateIntradayQuotes(bufferItem.idx, () => {
              this.isLoading = false;
              this.calibrationBuffer.shift();
              this.triggerNextCalibration();
            })
              .pipe(take(1))
              .subscribe(() => {
              }, () => {
                this.isLoading = false;
                this.calibrationBuffer.shift();
                this.triggerNextCalibration();
              }));
          });
        this.triggerNextCalibration();
      }, `activateAllIntradayQuotes${stock}`);
    });
  }

  ngOnDestroy() {
    this.callChainSub.unsubscribe();
    this.bufferSubject.unsubscribe();
  }
}

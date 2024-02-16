import { Injectable } from '@angular/core';
import { MachineLearningService } from '@shared/services/machine-learning/machine-learning.service';
import * as moment from 'moment-timezone';
import crc from 'crc';
import Stocks from '../rh-table/backtest-stocks.constant';
import { MachineDaytradingService } from '../machine-daytrading/machine-daytrading.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface FeatureData {
  date: string;
  input: number[];
  output: number[];
}

interface TargetData {
  symbol: string;
  dates: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FindPatternService {
  backtestBuffer$ = new Subject();
  findPatternServiceDestroy$ = new Subject();
  startPatternSearch$ = new Subject();
  targetPatterns = null;
  foundPatterns = [];
  targetList: TargetData[] = [
    { symbol: 'TSLA', dates: ['2023-10-30', '2023-10-31', '2023-11-01'] },
    { symbol: 'META', dates: ['2022-11-04', '2023-10-27'] }
  ];
  foundPatternCounter = 0;
  counterLength = 5;

  maxSearch = Stocks.length;
  searchCount = 0;
  constructor(private machineLearningService: MachineLearningService,
    private machineDaytradingService: MachineDaytradingService
  ) { }

  async developStrategy() {
    this.searchCount = 0;
    this.startPatternSearch$.complete();
    this.startPatternSearch$ = new Subject();
    this.findPatternServiceDestroy$ = new Subject();
    this.startPatternSearch$.subscribe(start => {
      if (start) {
        this.find();
      }
    });
    this.buildTargetPatterns();
  }

  buildTargetPatterns() {
    if (!this.targetPatterns) {
      this.targetPatterns = {};
      this.targetList.forEach((target: TargetData, index: number) => {
        const range = 5;
        const limit = 0.01;
        const endDate = moment().format('YYYY-MM-DD');
        const startDate = moment().subtract({ day: 365 }).format('YYYY-MM-DD');
        this.machineLearningService.getPredictDailyDataV4(target.symbol,
          endDate,
          startDate,
          0.7,
          null,
          range,
          limit)
          .subscribe(data => {
            target.dates.forEach(d => {
              const endIdx = data.findIndex(val => d === moment(val.date).format('YYYY-MM-DD'));
              const targetPattern = this.getPattern(target.symbol, data, endIdx);
              this.targetPatterns[targetPattern.key] = targetPattern.data;
            });
            console.log(this.targetPatterns);
            if (index === this.targetList.length - 1) {
              this.startPatternSearch$.next(true);
            }
          });
      });
    }
  }

  getPattern(stock: string, data: FeatureData[], idx: number) {
    let counter = this.counterLength;

    if (data.length < counter || idx <= counter) {
      return null;
    }
    const patternObj = {
      label: stock,
      value: [],
      original: []
    };
    while (counter >= 0) {
      patternObj.value = patternObj.value.concat(data[idx - counter].input);
      patternObj.original = [stock, data[idx - counter].date];
      counter--;
    }
    return {
      key: this.getHashValue(patternObj.value),
      data: patternObj
    };
  }

  find() {
    this.backtestBuffer$.unsubscribe();
    this.backtestBuffer$ = new Subject();

    this.machineDaytradingService.setCurrentStockList(Stocks);

    this.backtestBuffer$
      .pipe(takeUntil(this.findPatternServiceDestroy$))
      .subscribe(() => {
        let stock = this.machineDaytradingService.getNextStock();
        this.getData(stock);
      });
    this.triggerBacktestNext();
  }

  getData(stock: string) {
    const range = 5;
    const limit = 0.01;
    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract({ day: 365 }).format('YYYY-MM-DD');
    this.machineLearningService.getPredictDailyDataV4(stock,
      endDate,
      startDate,
      0.7,
      null,
      range,
      limit)
      .subscribe(data => {
        let counter = this.counterLength;
        const recentData = data.slice(data.length - 30, data.length);
        while (counter < recentData.length) {
          const currentPattern = this.getPattern(stock, recentData, counter);
          if (currentPattern && this.targetPatterns[currentPattern.key]) {
            this.foundPatterns.push(currentPattern);
            console.log('found matching pattern', currentPattern.key, currentPattern.data.label, currentPattern.data.original[1]);
            this.findPatternServiceDestroy$.complete();
            this.foundPatternCounter++;
          }
          counter++;
        }

        if (this.foundPatternCounter < 25 && this.searchCount < this.maxSearch) {
          this.triggerBacktestNext();
          this.searchCount++;
        } else {
          this.stop();
        }
      }, err => {
        this.triggerBacktestNext();
      });
  }

  triggerBacktestNext() {
    this.backtestBuffer$.next();
  }

  stop() {
    this.backtestBuffer$.unsubscribe();
    this.findPatternServiceDestroy$.unsubscribe();
    this.startPatternSearch$.unsubscribe();
  }

  getHashValue(arr: number[]) {
    const value = new Uint8Array(arr);
    return crc.crc32(value).toString(16);
  }
}

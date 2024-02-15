import { Injectable } from '@angular/core';
import { MachineLearningService } from '@shared/services/machine-learning/machine-learning.service';
import * as moment from 'moment-timezone';
import crc from 'crc';
import { PrimaryList } from '../rh-table/backtest-stocks.constant';
import { MachineDaytradingService } from '../machine-daytrading/machine-daytrading.service';
import { AiPicksService } from '@shared/services';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface FeatureData {
  date: string;
  input: number[];
  output: number[];
}
@Injectable({
  providedIn: 'root'
})
export class FindPatternService {
  backtestBuffer$ = new Subject();
  findPatternServiceDestroy$ = new Subject();
  targetPattern = null;
  seenPatterns = {};
  constructor(private machineLearningService: MachineLearningService,
    private machineDaytradingService: MachineDaytradingService) { }

  async developStrategy() {
    const range = 5;
    const limit = 0.01;
    const tgtStock = 'TSLA';
    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract({ day: 365 }).format('YYYY-MM-DD');
    this.machineLearningService.getPredictDailyDataV4(tgtStock,
      endDate,
      startDate,
      0.7,
      null,
      range,
      limit)
      .subscribe(data => {
        const endIdx = 267;
        this.targetPattern = this.getPattern(tgtStock, data, endIdx);
        console.log(this.targetPattern);
        this.find();
      });
  }
  getPattern(stock: string, data: FeatureData[], idx: number) {
    let counter = 3;

    if (data.length < counter || idx < counter) {
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

    this.machineDaytradingService.setCurrentStockList(PrimaryList);

    this.backtestBuffer$
      .pipe(takeUntil(this.findPatternServiceDestroy$)
      )
      .subscribe(() => {
        let stock = this.machineDaytradingService.getNextStock();

        if (stock !== this.targetPattern.data.label) {
          this.getData(stock);
        } else {
          this.triggerBacktestNext();
        }
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
        let counter = 0;
        while(counter < data.length) {
          const currentPattern = this.getPattern(stock, data, counter);
          if (currentPattern && currentPattern.key === this.targetPattern.key) {
            console.log('found matching pattern', currentPattern);
            this.findPatternServiceDestroy$.complete();
          }
          counter++;
        }

        this.triggerBacktestNext();
      });
  }

  triggerBacktestNext() {
    this.backtestBuffer$.next();
  }

  getHashValue(arr: number[]) {
    const value = new Uint8Array(arr);
    return crc.crc32(value).toString(16);
  }
}

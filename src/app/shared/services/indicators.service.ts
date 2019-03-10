import { Injectable } from '@angular/core';
import { BacktestService } from './backtest.service';

@Injectable()
export class IndicatorsService {

  constructor(private backtestService: BacktestService) { }

  async getBBand(reals: number[], period): Promise<any[]> {
    const body = {
      real: this.fillInMissingReals(reals),
      period: period,
      stddev: 2
    };

    return await this.backtestService.getBBands(body).toPromise();
  }

  async getSMA(reals: number[], period): Promise<any[]> {
    const body = {
      real: this.fillInMissingReals(reals),
      period: period
    };

    return await this.backtestService.getSMA(body).toPromise();
  }

  async getMFI(high: number[], low: number[], close: number[], volume: number[], period: number): Promise<any[]> {
    const body = {
      high,
      low,
      close,
      volume,
      period
    };

    return await this.backtestService.getMFI(body).toPromise();
  }


  async getROC(reals: number[], period): Promise<any[]> {
    const body = {
      real: this.fillInMissingReals(reals),
      period: period
    };

    return await this.backtestService.getROC(body).toPromise();
  }

  async getVwma(close: number[], volume: number[], period: number): Promise<any[]> {
    const body = {
      close: this.fillInMissingReals(close),
      volume: this.fillInMissingReals(volume),
      period: period
    };

    return await this.backtestService.getVwma(body).toPromise();
  }

  fillInMissingReals(reals: number[]) {
    for (let i = 1, length = reals.length; i < length; i++) {
      if (!reals[i]) {
        if (reals[i - 1] && reals[i + 1]) {
          reals[i] = (reals[i - 1] + reals[i + 1]) / 2;
        }
      }
    }
    return reals;
  }
}

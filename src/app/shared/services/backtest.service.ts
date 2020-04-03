import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { Observable, Subject } from 'rxjs';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Indicators } from '../models/indicators';
import { AuthenticationService } from './authentication.service';

const BASE_URL = environment.appUrl;

export interface ChartParam {
  algorithm: string;
  symbol: string;
  date: string;
  params?: any;
}

export interface DaytradeParameters {
  mfiRange?: number[];
  bbandPeriod?: number;
  lossThreshold?: number;
  profitThreshold?: number;
  minQuotes: number;
}

@Injectable()
export class BacktestService {
  currentChart: Subject<ChartParam> = new Subject();
  triggerBacktest: Subject<string> = new Subject();

  constructor(private http: HttpClient, private authenticationService: AuthenticationService) { }

  getInfo(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/mean-reversion/info`, data, {});
  }

  getInfoV2(symbol: string, to: string = null, from: string = null,
    short: number = 30, long: number = 90, deviation: number = 0.03,
    period: number = 80): Observable<any> {

    const data = {
      symbol,
      to,
      from
    };

    return this.http.post(`${BASE_URL}api/backtest/infov2`, data, {});
  }

  getInfoV2Chart(symbol: string, to: string = null, from: string = null,
    short: number = 30, long: number = 90, deviation: number = 0.03,
    period: number = 80): Observable<any> {

    const data = {
      symbol,
      to,
      from
    };

    return this.http.post(`${BASE_URL}api/backtest/infov2chart`, data, {});
  }

  getTimeline(symbol: string, from: string = null, to: string = null): Observable<any> {

    const data = {
      symbol,
      to,
      from
    };

    return this.http.post(`${BASE_URL}api/backtest/timeline`, data, {});
  }

  getBacktestChart(ticker: string,
    start: string,
    end: string,
    deviation: number,
    short: number,
    long: number): Observable<any> {
    const data = {
      ticker,
      start,
      end,
      deviation,
      short,
      long
    };

    return this.http.post(`${BASE_URL}api/backtest/chart`, data, {});
  }

  getBBMfiBacktestChart(symbol: string, to: string, from: string): Observable<any> {
    const data = {
      symbol,
      to,
      from
    };
    return this.http.post(`${BASE_URL}api/backtest/bb-mfi`, data, {});
  }

  getResistanceChart(symbol: string, from: string, to: string): Observable<any> {
    const data = {
      symbol,
      from,
      to
    };
    return this.http.post(`${BASE_URL}api/backtest/find-resistance`, data, {});
  }

  getMaCrossOverBacktestChart(symbol: string, to: string, from: string,
                              shortTerm: number, longTerm: number): Observable<any> {
    const data = {
      symbol,
      to,
      from,
      settings: [0, shortTerm, longTerm],
    };
    return this.http.post(`${BASE_URL}api/backtest/ma-crossover`, data, {});
  }

  getBacktestEvaluation(ticker: string,
    start: string,
    end: string,
    algo: string): Observable<any> {
    const data = {
      ticker,
      start,
      end,
      algo
    };

    return this.http.post(`${BASE_URL}api/backtest`, data, {});
  }

  getLastPriceTiingo(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/quote/current`, data, {});
  }

  getIEXIntraday(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/quote/iex`, data, {});
  }

  getIntraday(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/quote/intraday`, data, {});
  }

  getIntradayV3(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/quote/raw`, data, {});
  }

  getIntradayV4(symbol: string, startDate: string): Observable<any> {
    const data = {
      symbol,
      startDate
    };
    return this.http.post(`${BASE_URL}api/quote/intraday-tiingo`, data, {});
  }

  getYahooIntraday(symbol: string): Observable<any> {
    const body = {
      ticker: symbol,
      interval: '1m',
      range: '1d'
    };

    return this.http.post(`${BASE_URL}api/quote`, body, {});
  }

  getIntraday2(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/quote/intraday2`, data, {});
  }

  postIntraday(data: JSON): Observable<any> {
    return this.http.post(`${BASE_URL}api/quote/historical-intraday`, data, {});
  }

  getTdIntraday(symbol: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol,
        accountId: this.authenticationService.selectedTdaAccount.accountId
      }
    };

    return this.http.get(`${BASE_URL}api/portfolio/intraday`, options);
  }


  findIntraday(data: JSON): Observable<any> {
    const body = JSON.stringify(data);

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      body: body
    };

    return this.http.get(`${BASE_URL}api/quote/historical-intraday`, options);
  }

  getOptionChain(symbol: String): Observable<any> {
    const body = { symbol: symbol };
    return this.http.post(`${BASE_URL}api/quote/optionchain`, body, {});
  }

  getBBands(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/backtest/bbands`, data, {});
  }

  getSMA(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/backtest/sma`, data, {});
  }

  getMFI(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/backtest/mfi`, data, {});
  }

  getRsi(real: number[], period = 14): Observable<any> {
    const body = { real, period };
    return this.http.post(`${BASE_URL}api/backtest/rsi`, body, {});
  }

  getROC(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/backtest/roc`, data, {});
  }

  getVwma(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}api/backtest/vwma`, data, {});
  }

  pingGoliath() {
    return this.http.get(`${BASE_URL}api/backtest/data-status`);
  }

  pingArmidillo() {
    return this.http.get(`${BASE_URL}api/backtest/analysis-status`);
  }

  getRnn(symbol: string, to: string = null, modelName: number[] = null): Observable<any> {
    const body = {
      symbol,
      to,
      modelName: modelName.join()
    };

    return this.http.post(`${BASE_URL}api/backtest/rnn-status`, body, {});
  }

  runRnn(symbol: string, to: string = null, from: string = null): Observable<any> {
    const data = {
      symbol,
      to,
      from
    };

    return this.http.post(`${BASE_URL}api/backtest/rnn`, data, {});
  }

  activateRnn(symbol: string, to: string = null): Observable<any> {
    const data = {
      symbol,
      to
    };

    return this.http.post(`${BASE_URL}api/backtest/rnn-activate`, data, {});
  }

  runLstmV2(symbol: string, endDate: string = null, startDate: string = null): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol,
        startDate,
        endDate
      }
    };
    return this.http.get(`${BASE_URL}api/machine-learning/test-model`, options);
  }

  activateLstmV2(symbol: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol
      }
    };

    return this.http.get(`${BASE_URL}api/machine-learning/guess-activate`, options);
  }

  getDaytradeIndicators(quotes: any, period: number, stddev: number, mfiPeriod: number,
    vwmaPeriod: number): Observable<any> {
      const data = {
        quotes,
        period,
        stddev,
        mfiPeriod,
        vwmaPeriod
      };
    return this.http.post(`${BASE_URL}api/backtest/daytrade-indicators`, data, {});
  }

  getDaytradeBacktest(symbol: any, currentDate: string, startDate: string,
    parameters: DaytradeParameters): Observable<any> {
      const data = {
        symbol,
        currentDate,
        startDate,
        parameters
      };
    return this.http.post(`${BASE_URL}api/backtest/daytrade-backtest`, data, {});
  }

  getDaytradeRecommendation(price: number, paidPrice: number, indicators: Indicators,
    parameters: DaytradeParameters): Observable<any> {
      const data = {
        price,
        paidPrice,
        indicators,
        parameters
      };
    return this.http.post(`${BASE_URL}api/backtest/daytrade-recommendation`, data, {});
  }

  calibrateDaytrade(symbols: string[], currentDate: string, startDate: string): Observable<any> {
      const data = {
        symbols,
        currentDate,
        startDate
      };
    return this.http.post(`${BASE_URL}api/backtest/daytrade-calibrate`, data, {});
  }
}

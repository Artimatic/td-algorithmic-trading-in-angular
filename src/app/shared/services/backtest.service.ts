import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

const BASE_URL = environment.appUrl;

@Injectable()
export class BacktestService {

    constructor(private http: HttpClient) { }

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

    findIntraday(data: JSON): Observable<any> {
        const body = JSON.stringify(data);

        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        const options = {
            headers: headers,
            body: body
        };

        return this.http.get(`${BASE_URL}api/quote/historical-intraday`, options);
    }


    getQuote(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/quote`, data, {});
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

    getRnn(symbol: string, to: string = null, from: string = null): Observable<any> {
        const query = {
            symbol,
            to
        };

        return this.http.get(`${BASE_URL}api/backtest/rnn`, {params: query});
    }

    runRnn(symbol: string, to: string = null, from: string = null): Observable<any> {
        const data = {
            symbol,
            to,
            from
        };

        return this.http.post(`${BASE_URL}api/backtest/rnn`, data, {});
    }
}

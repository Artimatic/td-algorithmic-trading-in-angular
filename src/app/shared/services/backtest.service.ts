import { Http, RequestOptions, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { Stock } from './../../shared';

import { environment } from '../../../environments/environment';

import { AlgoChartV2 } from '../models/algo-chart-v2';

const BASE_URL = environment.appUrl;

@Injectable()
export class BacktestService {

    constructor(private http: Http) { }

    getInfo(data: any): Observable<Stock> {
        return this.http.post(`${BASE_URL}api/mean-reversion/info`, data, {})
            .map(r => r.json());
    }

    getInfoV2(symbol: string, to: string = null, from: string = null,
        short: number = 30, long: number = 90, deviation: number = 0.03,
        period: number = 80): Observable<Stock> {

        const data = {
            symbol,
            to,
            from
        };

        return this.http.post(`${BASE_URL}api/backtest/infov2`, data, {})
            .map(r => r.json());
    }

    getInfoV2Chart(symbol: string, to: string = null, from: string = null,
        short: number = 30, long: number = 90, deviation: number = 0.03,
        period: number = 80): Observable<AlgoChartV2[]> {

        const data = {
            symbol,
            to,
            from
        };

        return this.http.post(`${BASE_URL}api/backtest/infov2chart`, data, {})
            .map(r => r.json());
    }

    getTimeline(symbol: string, from: string = null, to: string = null): Observable<any[]> {

        const data = {
            symbol,
            to,
            from
        };

        return this.http.post(`${BASE_URL}api/backtest/timeline`, data, {})
            .map(r => r.json());
    }

    getBacktestChart(ticker: string,
        start: string,
        end: string,
        deviation: number,
        short: number,
        long: number): Observable<any[]> {
        const data = {
            ticker,
            start,
            end,
            deviation,
            short,
            long
        };

        return this.http.post(`${BASE_URL}api/backtest/chart`, data, {})
            .map(r => r.json());
    }

    getBacktestEvaluation(ticker: string,
        start: string,
        end: string,
        algo: string): Observable<any[]> {
        const data = {
            ticker,
            start,
            end,
            algo
        };

        return this.http.post(`${BASE_URL}api/backtest`, data, {})
            .map(r => r.json());
    }


    getPrices(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/quote/current`, data, {})
            .map(r => r.json());
    }

    getPrice(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/quote/price`, data, {})
            .map(r => r.json());
    }

    getIntraday(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/quote/intraday`, data, {})
            .map(r => r.json());
    }

    getIntradayV3(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/quote/raw`, data, {})
            .map(r => r.json());
    }

    getYahooIntraday(symbol: string): Observable<any> {
        const body = {
            ticker: symbol,
            interval: '1m',
            range: '1d'
        };

        return this.http.post(`${BASE_URL}api/quote`, body, {})
            .map(r => r.json());
    }

    getIntraday2(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/quote/intraday2`, data, {})
            .map(r => r.json());
    }

    postIntraday(data: JSON): Observable<any> {
        return this.http.post(`${BASE_URL}api/quote/historical-intraday`, data, {})
            .map(r => r.json());
    }

    findIntraday(data: JSON): Observable<any> {
        const body = JSON.stringify(data);

        const headers = new Headers({ 'Content-Type': 'application/json' });
        const options = new RequestOptions({
            headers: headers,
            body: body
        });

        return this.http.get(`${BASE_URL}api/quote/historical-intraday`, options)
            .map(r => r.json());
    }


    getQuote(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/quote`, data, {})
            .map(r => r.json());
    }

    getOptionChain(symbol: String): Observable<any> {
        const body = { symbol: symbol };
        return this.http.post(`${BASE_URL}api/quote/optionchain`, body, {})
            .map(r => r.json());
    }

    getBBands(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/backtest/bbands`, data, {})
            .map(r => r.json());
    }

    getSMA(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/backtest/sma`, data, {})
            .map(r => r.json());
    }

    getMFI(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/backtest/mfi`, data, {})
            .map(r => r.json());
    }

    getROC(data: any): Observable<any> {
        return this.http.post(`${BASE_URL}api/backtest/roc`, data, {})
            .map(r => r.json());
    }
}

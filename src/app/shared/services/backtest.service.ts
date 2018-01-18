import { Http } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import {
  Stock
} from './../../shared';

import { environment } from '../../../environments/environment';

const BASE_URL = environment.appUrl;

@Injectable()
export class BacktestService {

  constructor(private http: Http) { }

  getInfo(data: any): Observable<Stock> {
    console.log('info: ', data);
    return this.http.post(`${BASE_URL}api/mean-reversion/info`, data, {})
      .map(r => r.json());
  }

  getBacktest(data: any): Observable<any[]> {
    console.log('backtest: ', data);
    return this.http.post(`${BASE_URL}api/backtest/chart`, data, {})
      .map(r => r.json());
  }
}

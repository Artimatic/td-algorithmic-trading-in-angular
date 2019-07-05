import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import { AuthenticationService } from './authentication.service';
import { Holding } from '../models';
import * as _ from 'lodash';

@Injectable()
export class PortfolioService {
  constructor(
    private http: Http,
    private authenticationService: AuthenticationService) {
  }

  getPortfolio(): Observable<Holding[]> {
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
    const options = new RequestOptions({ headers: headers });

    return this.http.get('/api/portfolio/positions/', options)
      .map((response: Response) => {
        return response.json().results;
      });
  }

  getResource(url: string): Observable<any> {
    const body = { instrument: url };
    return this.http.post('/api/portfolio/resources', body)
      .map((response: Response) => response.json());
  }

  sell(holding: Holding, quantity: number, price: number, type: string): Observable<any> {
    if (quantity === 0) {
      throw new Error('Order Quantity is 0');
    }
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
    const options = new RequestOptions({ headers: headers });
    const body = {
      'account': this.authenticationService.myAccount.account,
      'url': holding.instrument,
      'symbol': holding.symbol,
      'quantity': quantity,
      'type': type
    };

    if (price) {
      body['price'] = price;
    }

    return this.http.post('/api/portfolio/sell', body, options)
      .map((response: Response) => {
        return response.json();
      });
  }

  buy(holding: Holding, quantity: number, price: number, type: string): Observable<any> {
    if (quantity === 0) {
      throw new Error('Order Quantity is 0');
    }
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
    const options = new RequestOptions({ headers: headers });
    const body = {
      'account': this.authenticationService.myAccount.account,
      'url': holding.instrument,
      'symbol': holding.symbol,
      'quantity': quantity,
      'price': price,
      'type': type
    };

    return this.http.post('/api/portfolio/buy', body, options)
      .map((response: Response) => {
        return response.json();
      });
  }

  extendedHoursBuy(holding: Holding, quantity: number, price: number): Observable<any> {
    if (quantity === 0) {
      throw new Error('Order Quantity is 0');
    }
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
    const options = new RequestOptions({ headers: headers });
    const body = {
      'account': this.authenticationService.myAccount.account,
      'url': holding.instrument,
      'symbol': holding.symbol,
      'quantity': quantity,
      'price': price,
      'type': 'limit',
      'extendedHour': true
    };

    return this.http.post('/api/portfolio/buy', body, options)
      .map((response: Response) => {
        return response.json();
      });
  }

  getInstruments(symbol: string): Observable<any> {
    const body = { symbol: symbol };
    return this.http.post('/api/portfolio/instruments', body)
      .map((response: Response) => response.json());
  }

  getQuote(symbol: string): Observable<any> {
    const options = new RequestOptions();
    return this.http.get(`/api/portfolio/quote?symbol=${symbol}`, options)
      .map((response: Response) => {
        const price = parseInt(response.text());
        return _.round(price, 2)
      });
  }
}

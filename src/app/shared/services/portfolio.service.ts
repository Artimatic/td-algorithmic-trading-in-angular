import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import { AuthenticationService } from './authentication.service';
import { Holding } from '../models';
import * as _ from 'lodash';
import { GlobalSettingsService, Brokerage } from '../../settings/global-settings.service';

@Injectable()
export class PortfolioService {
  constructor(
    private http: Http,
    private authenticationService: AuthenticationService,
    private globalSettingsService: GlobalSettingsService) {
  }

  getPortfolio(): Observable<Holding[]> {
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.getToken() });
    const options = new RequestOptions({ headers: headers });

    return this.http.get('/api/portfolio/positions/', options)
      .map((response: Response) => {
        return response.json().results;
      });
  }

  getTdPortfolio(): Observable<any> {
    const options = {
      params: {
        accountId: this.authenticationService.selectedTdaAccount.accountId
      }
    };
    return this.http.get('/api/portfolio/v2/positions/', options)
      .map((response: Response) => response.json());
  }

  getResource(url: string): Observable<any> {
    const body = { instrument: url };
    return this.http.post('/api/portfolio/resources', body)
      .map((response: Response) => response.json());
  }

  sell(holding: Holding, quantity: number, price: number, type: string): Observable<any> {
    if (this.globalSettingsService.brokerage === Brokerage.Robinhood) {
      return this.sellRh(holding, quantity, price, type);
    } else if (this.globalSettingsService.brokerage === Brokerage.Td) {
      return this.sendTdSell(holding, quantity, price, false);
    }
  }

  buy(holding: Holding, quantity: number, price: number, type: string): Observable<any> {
    if (this.globalSettingsService.brokerage === Brokerage.Robinhood) {
      return this.buyRh(holding, quantity, price, type);
    } else if (this.globalSettingsService.brokerage === Brokerage.Td) {
      return this.sendTdBuy(holding, quantity, price, false);
    }
  }

  sellRh(holding: Holding, quantity: number, price: number, type: string): Observable<any> {
    if (quantity === 0) {
      throw new Error('Order Quantity is 0');
    }
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.getToken() });
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

  buyRh(holding: Holding, quantity: number, price: number, type: string): Observable<any> {
    if (quantity === 0) {
      throw new Error('Order Quantity is 0');
    }
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.getToken() });
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
    if (this.globalSettingsService.brokerage === Brokerage.Robinhood) {
      return this.extendedHoursRhBuy(holding, quantity, price);
    } else if (this.globalSettingsService.brokerage === Brokerage.Td) {
      return this.sendTdBuy(holding, quantity, price, true);
    }
  }

  extendedHoursRhBuy(holding: Holding, quantity: number, price: number): Observable<any> {
    if (quantity === 0) {
      throw new Error('Order Quantity is 0');
    }
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.getToken() });
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
    const options = {
      params: {
        symbol,
        accountId: this.authenticationService.selectedTdaAccount.accountId
      }
    };

    return this.http.get('/api/portfolio/quote', options)
      .map((response: Response) => response.json());
  }

  getPrice(symbol: string): Observable<any> {
    const options: any = {
      params: {
        symbol
      }
    };

    if (this.authenticationService.selectedTdaAccount) {
      options.params.accountId = this.authenticationService.selectedTdaAccount.accountId;
    }
    return this.http.get('/api/portfolio/quote', options)
      .map((response: Response) => {
        return _.round(response.json().askPrice, 2);
      });
  }

  sendTdBuy(holding: Holding, quantity: number, price: number, extended: boolean): Observable<any> {
    const body = {
      symbol: holding.symbol,
      quantity: quantity,
      price: price,
      type: 'LIMIT',
      extendedHours: extended,
      accountId: this.authenticationService.selectedTdaAccount.accountId
    };
    return this.http.post('/api/portfolio/v2/buy', body);
  }

  sendTdSell(holding: Holding, quantity: number, price: number, extended: boolean): Observable<any> {
    const body = {
      symbol: holding.symbol,
      quantity: quantity,
      price: price,
      type: 'MARKET',
      extendedHours: extended,
      accountId: this.authenticationService.selectedTdaAccount.accountId
    };
    return this.http.post('/api/portfolio/v2/sell', body);
  }

  getTdBalance(): Observable<any> {
    const options = {
      params: {
        accountId: this.authenticationService.selectedTdaAccount.accountId
      }
    };

    return this.http.get('/api/portfolio/balance', options)
      .map((response: Response) => response.json());
  }
}

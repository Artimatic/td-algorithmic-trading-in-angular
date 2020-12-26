import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';

import { AuthenticationService } from './authentication.service';
import { Holding } from '../models';
import * as _ from 'lodash';
import { GlobalSettingsService, Brokerage } from '../../settings/global-settings.service';
import { MatSnackBar } from '@angular/material';
import { Subject } from 'rxjs';

export interface PortfolioInfoHolding {
  name: string;
  pl: number;
  netLiq: number;
  shares: number;
  alloc: number;
  recommendation: string;
  buyReasons: string;
  sellReasons: string;
  buyConfidence: number;
  sellConfidence: number;
}

@Injectable()
export class PortfolioService {
  portfolioSubject: Subject<PortfolioInfoHolding> = new Subject();
  portfolio;

  constructor(
    private http: HttpClient,
    private authenticationService: AuthenticationService,
    private globalSettingsService: GlobalSettingsService,
    public snackBar: MatSnackBar) {
  }

  getPortfolio(): Observable<any> {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authenticationService.getToken() });
    const options = { headers: headers };

    return this.http.get('/api/portfolio/positions/', options);
  }

  getTdPortfolio(): Observable<any> {
    const options = {
      params: {
        accountId: this.getAccountId()
      }
    };
    return this.http.get('/api/portfolio/v2/positions/', options);
  }

  getResource(url: string): Observable<any> {
    const body = { instrument: url };
    return this.http.post('/api/portfolio/resources', body);
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
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authenticationService.getToken() });
    const options = { headers: headers };
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

    return this.http.post('/api/portfolio/sell', body, options);
  }

  buyRh(holding: Holding, quantity: number, price: number, type: string): Observable<any> {
    if (quantity === 0) {
      throw new Error('Order Quantity is 0');
    }
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authenticationService.getToken() });
    const options = { headers: headers };
    const body = {
      'account': this.authenticationService.myAccount.account,
      'url': holding.instrument,
      'symbol': holding.symbol,
      'quantity': quantity,
      'price': price,
      'type': type
    };

    return this.http.post('/api/portfolio/buy', body, options);
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
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authenticationService.getToken() });
    const options = { headers: headers };
    const body = {
      'account': this.authenticationService.myAccount.account,
      'url': holding.instrument,
      'symbol': holding.symbol,
      'quantity': quantity,
      'price': price,
      'type': 'limit',
      'extendedHour': true
    };

    return this.http.post('/api/portfolio/buy', body, options);
  }

  getInstruments(symbol: string): Observable<any> {
    const body = { symbol: symbol };
    return this.http.post('/api/portfolio/instruments', body);
  }

  getQuote(symbol: string): Observable<any> {
    const options = {
      params: {
        symbol,
        accountId: this.getAccountId()
      }
    };

    return this.http.get('/api/portfolio/quote', options);
  }

  getPrice(symbol: string): Observable<number> {
    const options: any = {
      params: {
        symbol
      }
    };

    if (this.authenticationService.selectedTdaAccount) {
      options.params.accountId = this.getAccountId();
    }
    return this.http.get('/api/portfolio/quote', options)
      .pipe(
        map((response) => {
          return _.round(response['askPrice'], 2);
        })
      );
  }

  sendTdBuy(holding: Holding, quantity: number, price: number, extended: boolean): Observable<any> {
    const body = {
      symbol: holding.symbol,
      quantity: quantity,
      price: price,
      type: 'LIMIT',
      extendedHours: extended,
      accountId: this.getAccountId()
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
      accountId: this.getAccountId()
    };
    return this.http.post('/api/portfolio/v2/sell', body);
  }

  getTdBalance(): Observable<any> {
    const accountId = this.getAccountId();
    const options = {
      params: {
        accountId
      }
    };

    return this.http.get('/api/portfolio/balance', options);
  }

  getAccountId() {
    if (!this.authenticationService.selectedTdaAccount) {
      this.snackBar.open('Login Missing - Please log in with TD Ameritrade account', 'Dismiss', {
        duration: 5000,
      });
      return null;
    } else {
      return this.authenticationService.selectedTdaAccount.accountId;
    }
  }
}

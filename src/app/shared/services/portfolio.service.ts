import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/map'

import { AuthenticationService } from './authentication.service';
import { Holding } from '../models';

@Injectable()
export class PortfolioService {
    constructor(
        private http: Http,
        private authenticationService: AuthenticationService) {
    }

    getPortfolio(): Observable<Holding[]> {
        let headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers: headers });

        return this.http.get('/api/portfolio/positions', options)
            .map((response: Response) => {
                return response.json().results;
            });
    }

    getResource(url: string): Observable<any> {
        let body = { instrument: url };
        return this.http.post('/api/portfolio/resources', body)
            .map((response: Response) => response.json());
    }

    sell(holding: Holding, quantity: number, price: number): Observable<any> {
        let headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers: headers });
        let body = {
            "account": this.authenticationService.myAccount.url,
            "url": holding.instrument,
            "symbol": holding.symbol,
            "quantity": quantity,
            "price": price
        };

        return this.http.post('/api/portfolio/sell', body, options)
            .map((response: Response) => {
                return response.json();
            });
    }
}
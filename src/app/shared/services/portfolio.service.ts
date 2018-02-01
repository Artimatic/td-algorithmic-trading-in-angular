import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/map'
 
import { AuthenticationService } from '../services';
import { Holding } from '../models';
 
@Injectable()
export class PortfolioService {
    constructor(
        private http: Http,
        private authenticationService: AuthenticationService) {
    }
 
    getPortfolio(): Observable<Holding[]> {
        // add authorization header with jwt token
        let headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers: headers });
 
        // get users from api
        return this.http.get('/api/portfolio/positions', options)
            .map((response: Response) => response.json());
    }

    getAccount(): Observable<any[]> {
      // add authorization header with jwt token
      let headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
      let options = new RequestOptions({ headers: headers });

      // get users from api
      return this.http.get('/api/portfolio', options)
          .map((response: Response) => response.json());
  }
}
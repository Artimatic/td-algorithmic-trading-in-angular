import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/map'
import { Account } from '../account';

@Injectable()
export class AuthenticationService {
  public token: string;
  public myAccount: Account;

  constructor(private http: Http) {
    // set token if saved in local storage
    var currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.token = currentUser && currentUser.token;
  }

  login(username: string, password: string): Observable<boolean> {
    return this.http.post('/api/portfolio/login', { username: username, password: password })
      .map((res: Response) => {
        if (res) {
          if (res.status === 201) {
            return true;
          }
          else if (res.status === 200) {
            return true;
          }
        } else {
          return false;
        }
      });
  }

  mfa(username: string, password: string, code: number): Observable<boolean> {
    return this.http.post('/api/portfolio/mfa', { username: username, password: password, code: code })
      .map((response: Response) => {
        // login successful if there's a jwt token in the response
        let token = response.json() && response.json().token;
        if (token) {
          // set token property
          this.token = token;

          // store username and jwt token in local storage to keep user logged in between page refreshes
          localStorage.setItem('currentUser', JSON.stringify({ username: username, token: token }));

          this.loginInit();
          // return true to indicate successful login
          return true;
        } else {
          // return false to indicate failed login
          return false;
        }
      });
  }

  loginInit() {
    this.refreshAccount;
  }

  refreshAccount() {
    this.getPortfolioAccount().subscribe();
  }

  getPortfolioAccount(): Observable<Account> {
    let headers = new Headers({ 'Authorization': 'Bearer ' + this.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.get('/api/portfolio', options)
      .map((response: Response) => {
        this.myAccount = response;
        return response.json().results[0];
      });
  }

  logout(): void {
    // clear token remove user from local storage to log user out
    this.token = null;
    localStorage.removeItem('currentUser');
  }

  isAuthenticated() {
    if (localStorage.getItem('currentUser')) {
      return true;
    }
    return false;
  }
}

import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import { Account } from '../account';
import { MatDialog } from '@angular/material';
import { RedirectLoginDialogComponent } from '../../redirect-login-dialog/redirect-login-dialog.component';

export interface TdaAccount {
  accountId: string;
}


@Injectable()
export class AuthenticationService {
  private token: string;
  public myAccount: Account;
  public tdaAccounts: TdaAccount[];
  public selectedTdaAccount: TdaAccount;

  constructor(private http: Http, private dialog: MatDialog) { }

  openLoginDialog(): void {
    this.dialog.open(RedirectLoginDialogComponent, {
      width: '500px',
      height: '500px'
    });
  }

  getToken() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    this.token = currentUser && currentUser.token;
    return this.token;
  }

  login(username: string, password: string): Observable<boolean> {
    return this.http.post('/api/portfolio/login', { username: username, password: password })
      .map((res: Response) => {
        if (res) {
          if (res.status === 201) {
            return true;
          } else if (res.status === 200) {
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
        const token = response.json() && response.json().access_token;
        if (token) {
          // set token property
          this.token = token;

          // store username and jwt token in local storage to keep user logged in between page refreshes
          sessionStorage.setItem('currentUser', JSON.stringify({ username: username, token: token }));

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
    this.refreshAccount();
  }

  refreshAccount() {
    this.getPortfolioAccount().subscribe();
  }

  getPortfolioAccount(): Observable<Account> {
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.token });
    const options = new RequestOptions({ headers: headers });

    return this.http.get('/api/portfolio', options)
      .map((response: Response) => {
        const account = response.json().results;
        this.myAccount = account[account.length - 1];
        return this.myAccount;
      });
  }

  logout(): void {
    this.http.post('/api/portfolio/logout', { token: this.token }).subscribe();
    // clear token remove user from local storage to log user out
    this.token = null;
    sessionStorage.removeItem('currentUser');
  }

  isAuthenticated() {
    if (sessionStorage.getItem('currentUser')) {
      return true;
    }
    return false;
  }

  saveTdaLogin(newAccount: TdaAccount) {
    if (!this.tdaAccounts) {
      this.tdaAccounts = [];
    }
    if (this.tdaAccounts.length > 0) {
      const foundIdx = this.tdaAccounts.findIndex(account => {
        return account.accountId === newAccount.accountId;
      });
      if (foundIdx > -1) {
        this.tdaAccounts.splice(foundIdx, 1);
      }
    }

    this.tdaAccounts.push(newAccount);
    sessionStorage.setItem('tdaAccounts', JSON.stringify(this.tdaAccounts));
  }

  refreshTdaAccounts(): void {
    if (!this.selectedTdaAccount && this.tdaAccounts && this.tdaAccounts.length > 0) {
      for (const acc of this.tdaAccounts) {
        this.checkCredentials(acc.accountId)
          .subscribe(() => {
            this.selectedTdaAccount = this.tdaAccounts[0];
          }, () => {
            this.openLoginDialog();
          });
      }
    } else {
      this.openLoginDialog();
    }
  }

  selectTdaAccount(accountId: string): void {
    this.selectedTdaAccount = this.tdaAccounts.find((account: TdaAccount) => {
      return account.accountId === accountId;
    });
  }

  setTdaAccount(accountId, consumerKey, refreshToken): Observable<any> {
    const account: TdaAccount = {
      accountId
    };

    this.saveTdaLogin(account);
    this.selectTdaAccount(accountId);
    return this.setCredentials(accountId, consumerKey, refreshToken);
  }

  removeTdaAccount(accountId: string): void {
    if (this.selectedTdaAccount && this.selectedTdaAccount.accountId === accountId) {
      this.selectedTdaAccount = null;
    }
    const idx = this.tdaAccounts.findIndex((account: TdaAccount) => {
      return account.accountId === accountId;
    });

    this.tdaAccounts.splice(idx, 1);
    sessionStorage.setItem('tdaAccounts', JSON.stringify(this.tdaAccounts));
    this.deleteCredentials(accountId).subscribe();
  }

  setCredentials(accountId, key, refreshToken) {
    const body = {
      accountId,
      key,
      refreshToken
    };
    return this.http.post('/api/portfolio/v3/set-account', body);
  }

  checkCredentials(accountId) {
    const body = {
      accountId
    };
    return this.http.post('/api/portfolio/v3/check-account', body);
  }

  deleteCredentials(accountId) {
    const body = {
      accountId
    };
    return this.http.post('/api/portfolio/v3/delete-cred', body);
  }
}

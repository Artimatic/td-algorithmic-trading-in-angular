import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import { Account } from '../account';
import { RedirectLoginDialogComponent } from '../../redirect-login-dialog/redirect-login-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface TdaAccount {
  accountId: string;
  appKey?: string;
  refreshKey?: string;
}


@Injectable()
export class AuthenticationService {
  private token: string;
  public myAccount: Account;
  public tdaAccounts: TdaAccount[];
  public selectedTdaAccount: TdaAccount;

  constructor(private http: HttpClient,
    private dialogService: DialogService,
    private messageService: MessageService) { }

  openLoginDialog(): void {
    this.dialogService.open(RedirectLoginDialogComponent, {
      header: 'Algo Trader',
      width: '30%'
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
    sessionStorage.setItem('accounts', JSON.stringify(this.tdaAccounts));
  }

  retrieveLocalAccounts(): void {
    this.tdaAccounts = JSON.parse(sessionStorage.getItem('accounts'));

    this.refreshTdaAccounts();
  }

  refreshTdaAccounts(): void {
    if (!this.selectedTdaAccount) {
      this.openLoginDialog();
    }
  }

  selectTdaAccount(accountId: string): void {
    this.selectedTdaAccount = this.tdaAccounts.find((account: TdaAccount) => {
      return account.accountId === accountId;
    });

    setTimeout(() => {
      this.checkCredentials(this.selectedTdaAccount.accountId)
      .subscribe(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Credentials selected'
        });
      }, () => {
        if (this.selectedTdaAccount.appKey && this.selectedTdaAccount.refreshKey) {
          this.setTdaAccount(this.selectedTdaAccount.accountId);
        } else {
          this.messageService.add({
            severity: 'danger',
            summary: 'Current selected account info is missing. Reenter credentials.'
          });
        }
      });
    }, 1000);
  }

  setTdaAccount(accountId) {
    const account: TdaAccount = {
      accountId: accountId
    };

    this.saveTdaLogin(account);
    this.selectTdaAccount(accountId);
  }

  removeTdaAccount(accountId: string): void {
    if (this.selectedTdaAccount && this.selectedTdaAccount.accountId === accountId) {
      this.selectedTdaAccount = null;
    }
    const idx = this.tdaAccounts.findIndex((account: TdaAccount) => {
      return account.accountId === accountId;
    });

    this.tdaAccounts.splice(idx, 1);
    sessionStorage.setItem('accounts', JSON.stringify(this.tdaAccounts));
    this.deleteCredentials(accountId).subscribe();
  }

  signIn(appKey, callbackUrl) {
    window.location.assign(`/api/portfolio/login?consumerKey=${appKey}&callbackUrl=${callbackUrl}`);
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

  getAccessToken(accountId: string, appKey: string, secret: string, code: string, callbackUrl: string): Observable<any> {
    return this.http.post('/api/portfolio/access-token',
      {
        accountId,
        appKey,
        secret,
        code,
        callbackUrl
      }).pipe(tap(() => {
        this.setTdaAccount(accountId);
      }), catchError((error: any) => {
        console.log(error);
        this.messageService.add({
          severity: 'danger',
          summary: 'Issue with getting access token. Retrying login in 10 seconds.'
        });
        setTimeout(() => {
          this.signIn(appKey, callbackUrl);
        }, 10000);
        return throwError(() => error);
      }));
  }
}

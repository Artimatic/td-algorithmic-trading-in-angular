import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import { Account } from '../account';
import { RedirectLoginDialogComponent } from '../../redirect-login-dialog/redirect-login-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

export interface TdaAccount {
  accountId: string;
  consumerKey?: string;
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
    sessionStorage.setItem('tdaAccounts', JSON.stringify(this.tdaAccounts));
  }

  retrieveLocalAccounts(): void {
    this.tdaAccounts = JSON.parse(sessionStorage.getItem('tdaAccounts'));

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

    this.checkCredentials(this.selectedTdaAccount.accountId)
      .subscribe(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Credentials selected'
        });
      }, () => {
        if (this.selectedTdaAccount.consumerKey && this.selectedTdaAccount.refreshKey) {
          this.setTdaAccount(this.selectedTdaAccount.accountId,
            this.selectedTdaAccount.consumerKey,
            this.selectedTdaAccount.refreshKey).subscribe(() => { }, () => {
              this.messageService.add({
                severity: 'danger',
                summary: 'Current selected account info is missing. Reenter credentials.'
              });
            });
        } else {
          this.messageService.add({
            severity: 'danger',
            summary: 'Current selected account info is missing. Reenter credentials.'
          });
        }
      });
  }

  setTdaAccount(accountId, consumerKey, refreshToken): Observable<any> {
    const account: TdaAccount = {
      accountId
    };


    return this.setCredentials(accountId, consumerKey, refreshToken)
      .map(() => {
        this.saveTdaLogin(account);
        this.selectTdaAccount(accountId);
      });
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

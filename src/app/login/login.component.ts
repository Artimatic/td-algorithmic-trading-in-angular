import { Component, OnInit } from '@angular/core';
import { MatDialog, MatSnackBar } from '@angular/material';
import { LoginDialogComponent } from '../login-dialog/login-dialog.component';
import { AuthenticationService } from '../shared';
import { SelectItem } from 'primeng/components/common/selectitem';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  authenticated = false;
  hide = true;
  model: any = {};
  loading = false;
  error = '';
  selectedLogin = '';
  loginForms: SelectItem[];

  tdaForm: FormGroup;
  selectedItem;
  saveCredentials = false;

  constructor(public dialog: MatDialog,
    public snackBar: MatSnackBar,
    public authenticationService: AuthenticationService) { }

  ngOnInit() {
    this.tdaForm = new FormGroup({
      accountId: new FormControl('', Validators.required),
      consumerKey: new FormControl('', Validators.required),
      refreshToken: new FormControl('', Validators.required)
    });

    this.loginForms = [
      {
        label: 'Robinhood',
        value: 'robinhood'
      },
      {
        label: 'TD Ameritrade',
        value: 'tda'
      }
    ];

    this.selectedLogin = 'tda';
    this.selectedItem = '';
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent, {
      width: '500px',
      height: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      this.checkAuthenticated();
    });
  }

  checkAuthenticated() {
    if (sessionStorage.getItem('currentUser')) {
      this.authenticated = true;
    } else {
      this.authenticated = false;
    }
  }

  logout() {
    this.authenticationService.logout();
    window.location.reload();
  }

  login() {
    this.loading = true;
    this.authenticationService.login(this.model.username, this.model.password)
      .subscribe(result => {
        if (result === true) {
          this.loading = false;
        } else {
          this.loading = false;
        }
      },
      error => {
        this.snackBar.open('Username or password is incorrect', 'Dismiss', {
          duration: 2000,
        });
        this.loading = false;
      });
  }

  saveTdaLogin() {
    this.authenticationService.setTdaAccount(this.tdaForm.value.accountId,
      this.tdaForm.value.consumerKey,
      this.tdaForm.value.refreshToken,
      this.saveCredentials)
      .subscribe(() => {
        this.tdaForm.reset();
        this.snackBar.open('Credentials saved.', 'Dismiss', {duration: 2000});
      },
      error => {
        console.log(error);
        this.snackBar.open('Error setting TDA account.', 'Dismiss');
      });
  }

  selectAccount(account) {
    this.authenticationService.selectTdaAccount(account.accountId);
  }

  removeAccount(account) {
    this.authenticationService.removeTdaAccount(account.accountId);
  }
}

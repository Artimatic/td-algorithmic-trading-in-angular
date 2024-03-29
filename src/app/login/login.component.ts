import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginDialogComponent } from '../login-dialog/login-dialog.component';
import { AuthenticationService } from '../shared';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  @Output() credentialSet: EventEmitter<boolean> = new EventEmitter();
  authenticated = false;
  hide = true;
  model: any = {};
  loading = false;
  error = '';
  selectedLogin = '';
  tdaForm: FormGroup;
  selectedItem;

  constructor(public dialogService: DialogService,
    public snackBar: MatSnackBar,
    public authenticationService: AuthenticationService) { }

  ngOnInit() {
    this.tdaForm = new FormGroup({
      accountId: new FormControl(document.cookie
        .split('; ')
        .find((row) => row.startsWith('accountId')) || '', Validators.required),
      consumerKey: new FormControl('', Validators.required),
      refreshToken: new FormControl('', Validators.required),
      saveToCookie: new FormControl(false, Validators.required),
    });

    this.selectedLogin = 'tda';
    this.selectedItem = '';
  }

  openDialog(): void {
    const dialogRef = this.dialogService.open(LoginDialogComponent, {
      header: 'Algo Trader',
      width: '30%'
    });

    dialogRef.onClose.subscribe(() => {
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

  saveTdaLogin() {
    this.loading = true;

    this.authenticationService.setTdaAccount(this.tdaForm.value.accountId,
      this.tdaForm.value.consumerKey,
      this.tdaForm.value.refreshToken)
      .subscribe(() => {
        this.loading = false;
        this.tdaForm.reset();
        this.credentialSet.emit(true);
        this.snackBar.open('Credentials saved.', 'Dismiss', { duration: 2000 });
        if (this.tdaForm.value.saveToCookie) {
          document.cookie = `accountId=${this.tdaForm.value.accountId}; consumerKey=${this.tdaForm.value.consumerKey}; refreshToken=${this.tdaForm.value.refreshToken}; SameSite=None; Secure`;
        }
      },
        error => {
          console.log(error);
          this.snackBar.open('Error setting TDA account.', 'Dismiss');
        });
  }

  selectAccount(account) {
    this.authenticationService.selectTdaAccount(account.accountId);
    this.credentialSet.emit(true);
  }

  removeAccount(account) {
    this.authenticationService.removeTdaAccount(account.accountId);
  }
}

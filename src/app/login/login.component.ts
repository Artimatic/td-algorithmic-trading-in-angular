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
  hideSecret = true;
  hideKey = true;
  model: any = {};
  loading = false;
  error = '';
  selectedLogin = '';
  tdaForm: FormGroup;
  selectedItem;
  code = null;
  dialogRef;

  constructor(public dialogService: DialogService,
    public snackBar: MatSnackBar,
    public authenticationService: AuthenticationService) { }

  ngOnInit() {
    this.tdaForm = new FormGroup({
      accountId: new FormControl(document.cookie
        .split('; ')
        .find((row) => row.startsWith('accountId'))?.replace('accountId=', '') || '', Validators.required),
      appKey: new FormControl(document.cookie
        .split('; ')
        .find((row) => row.startsWith('appKey'))?.replace('appKey=', '') || '', Validators.required),
      secret: new FormControl(document.cookie
        .split('; ')
        .find((row) => row.startsWith('secret'))?.replace('secret=', '') || '', Validators.required),
      callbackUrl: new FormControl(document.cookie
        .split('; ')
        .find((row) => row.startsWith('callbackUrl'))?.replace('callbackUrl=', '') || '', Validators.required),
      saveToCookie: new FormControl(false, Validators.required),
    });

    this.selectedLogin = 'tda';
    this.selectedItem = '';    
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    if (code) {
      this.code = code;
    }
  }

  getAccessToken() {
    this.authenticationService.getAccessToken(this.tdaForm.value.accountId, this.tdaForm.value.appKey, this.tdaForm.value.secret, this.code, this.tdaForm.value.callbackUrl)
      .subscribe(() => this.dialogRef.close());
  }

  openDialog(): void {
    this.dialogRef = this.dialogService.open(LoginDialogComponent, {
      header: 'Algo Trader'
    });
    this.dialogRef.onClose.subscribe();
  }

  logout() {
    this.authenticationService.logout();
    window.location.reload();
  }

  signIn() {
    this.loading = true;
    if (this.tdaForm.value.saveToCookie) {
      document.cookie = `accountId=${this.tdaForm.value.accountId};SameSite=None;Secure`;
      document.cookie = `appKey=${this.tdaForm.value.appKey};SameSite=None;Secure`;
      document.cookie = `secret=${this.tdaForm.value.secret};SameSite=None;Secure`;
      document.cookie = `callbackUrl=${this.tdaForm.value.callbackUrl};SameSite=None;Secure`;
    }
    this.authenticationService.signIn(this.tdaForm.value.appKey, this.tdaForm.value.callbackUrl);
      
    // .subscribe(() => {
      //   this.loading = false;
      //   this.tdaForm.reset();
      //   this.credentialSet.emit(true);
      //   this.snackBar.open('Credentials saved.', 'Dismiss', { duration: 2000 });

      //   error => {
      //     console.log(error);
      //     this.snackBar.open('Error setting TDA account.', 'Dismiss');
      //   });
  }

  selectAccount(account) {
    this.authenticationService.selectTdaAccount(account.accountId);
    this.credentialSet.emit(true);
  }

  removeAccount(account) {
    this.authenticationService.removeTdaAccount(account.accountId);
  }
}

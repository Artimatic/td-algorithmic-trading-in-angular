import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { MatSnackBar } from '@angular/material';
import { LoginComponent } from '../login/login.component';
import { AuthenticationService } from '../shared';

@Component({
  selector: 'app-login-dialog',
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.css']
})
export class LoginDialogComponent implements OnInit {
  hide: boolean = true;
  mfa: boolean = false;
  model: any = {};
  loading = false;
  error = '';

  constructor(
    public snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<LoginComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private authenticationService: AuthenticationService) { }

  ngOnInit() { }

  onNoClick(): void {
    this.dialogRef.close();
  }

  login() {
    this.loading = true;
    if (this.mfa) {
      this.authenticationService.mfa(this.model.username, this.model.code)
        .subscribe(result => {
          console.log('rsult:', result);

          if (result === true) {
            this.mfa = true;
            this.loading = false;
          } else {
            // login failed
            this.snackBar.open('Username or password is incorrect');
            this.loading = false;
          }
        },
        error => {
          this.snackBar.open('Code is incorrect');
          this.loading = false;
        });
    } else {
      this.authenticationService.login(this.model.username, this.model.password)
        .subscribe(result => {
          console.log('rsult:', result);
          if (result === true) {
            this.mfa = true;
            this.loading = false;
          } else {
            // login failed
            this.snackBar.open('Username or password is incorrect');
            this.loading = false;
          }
        },
        error => {
          if(error.message === "Your account requires 2-step authentication.  Please enter in the code received on your device.") {
            this.mfa = true;
          } else {
            this.snackBar.open('Username or password is incorrect');
          }
          this.loading = false;
        });
    }

  }
}
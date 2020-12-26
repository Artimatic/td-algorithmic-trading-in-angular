import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { MatSnackBar } from '@angular/material';
import { LoginComponent } from '../login/login.component';
import { AuthenticationService } from '../shared';

@Component({
  selector: 'app-login-dialog',
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.css']
})
export class LoginDialogComponent implements OnInit {
  hide = true;
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
}

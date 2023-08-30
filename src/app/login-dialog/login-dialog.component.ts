import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    private authenticationService: AuthenticationService) { }

  ngOnInit() { }

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

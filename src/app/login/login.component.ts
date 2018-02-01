import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { LoginDialogComponent } from '../login-dialog/login-dialog.component';
import { AuthenticationService } from '../shared';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  authenticated: boolean = false;

  constructor(public dialog: MatDialog,
    private authenticationService: AuthenticationService) { }

  ngOnInit() {
    this.checkAuthenticated();
  }
  openDialog(): void {
    let dialogRef = this.dialog.open(LoginDialogComponent, {
      width: '500px',
      height: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      this.checkAuthenticated();
    });
  }

  checkAuthenticated() {
    if (localStorage.getItem('currentUser')) {
      this.authenticated = true;
    } else {
      this.authenticated = false;
    }
  }

  logout() {
    this.authenticationService.logout();
  }

}
import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { Router } from '@angular/router';

@Component({
  selector: 'app-redirect-login-dialog',
  templateUrl: './redirect-login-dialog.component.html',
  styleUrls: ['./redirect-login-dialog.component.css']
})
export class RedirectLoginDialogComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<RedirectLoginDialogComponent>, private router: Router) { }

  ngOnInit() {
  }

  closeDialog() {
    this.dialogRef.close();
  }

  redirectToLogin() {
    this.router.navigate(['/overview']);
    this.dialogRef.close();
  }
}

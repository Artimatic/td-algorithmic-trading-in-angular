import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-redirect-login-dialog',
  templateUrl: './redirect-login-dialog.component.html',
  styleUrls: ['./redirect-login-dialog.component.css']
})
export class RedirectLoginDialogComponent implements OnInit {

  constructor(public ref: DynamicDialogRef, private router: Router) { }

  ngOnInit() {
  }

  closeDialog() {
    this.ref.close();
  }

  redirectToLogin() {
    this.router.navigate(['/overview']);
    this.ref.close();
  }
}

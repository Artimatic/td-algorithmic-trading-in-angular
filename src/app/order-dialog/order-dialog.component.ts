import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { MatSnackBar } from '@angular/material';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Holding } from '../shared/models';
import { PortfolioService } from '../shared/services/portfolio.service';

@Component({
  selector: 'app-order-dialog',
  templateUrl: './order-dialog.component.html',
  styleUrls: ['./order-dialog.component.css']
})
export class OrderDialogComponent implements OnInit {
  options: FormGroup;
  loading: boolean = false;
  constructor(
    fb: FormBuilder,
    public snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<OrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Holding,
    private portfolioService: PortfolioService) {
    this.options = fb.group({
      'quantity': ['', Validators.min(0)],
      'price': ['', Validators.min(0)],
    });
  }

  ngOnInit() {
  }

  sell() {
    this.loading = true;
    console.log('data: ', this.data, this.options.value);
    this.loading = false;
  }

}

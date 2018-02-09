import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { MatSnackBar } from '@angular/material';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Holding } from '../shared/models';
import { PortfolioService } from '../shared/services/portfolio.service';
import { PortfolioTableComponent } from '../portfolio-table/portfolio-table.component';

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
      'quantity': [this.data.quantity, Validators.min(0)],
      'price': [this.data.realtime_price, Validators.min(0)],
    });
  }

  ngOnInit() {
  }

  sell() {
    this.loading = true;
    this.portfolioService.sell(this.data, this.options.value.quantity, this.options.value.price).subscribe(
      response => {
        this.snackBar.open("Success");
        this.loading = false;
      },
      error => {
        this.snackBar.open("Unknown error");
        this.loading = false;
      });
  }

}

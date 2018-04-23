import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { AuthenticationService, ReportingService } from '../shared';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-reporting',
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.css']
})
export class ReportingComponent implements OnInit {

  constructor(public dialog: MatDialog,
    private authenticationService: AuthenticationService,
    private reportingService: ReportingService) { }

  ngOnInit() {
  }

  openDialog() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      height: '500px',
      data: { title: 'Confirm', message: 'Download logs?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reportingService.exportAuditHistory();
      }
    });
  }
}

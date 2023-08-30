import { Component, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AuthenticationService, ReportingService } from '../shared';

@Component({
  selector: 'app-report-dialog',
  templateUrl: './report-dialog.component.html',
})
export class ReportDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }
}

@Component({
  selector: 'app-reporting',
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.css']
})
export class ReportingComponent {
  signout = true;
  constructor(public dialog: MatDialog,
    private authenticationService: AuthenticationService,
    private reportingService: ReportingService) { }

  openDialog() {
    const dialogRef = this.dialog.open(ReportDialogComponent, {
      width: '500px',
      height: '500px',
      data: { signout: this.signout }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reportingService.exportAuditHistory();
        if (result.signout) {
          this.authenticationService.logout();
        }
      }
    });
  }
}

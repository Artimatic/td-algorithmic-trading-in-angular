import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { ExcelService } from './excel-service.service';

@Injectable()
export class ReportingService {
  public logs: any[];

  constructor(private excelService: ExcelService) {
    this.logs = [];
  }

  addAuditLog(log) {
    const currentTime = moment().format('hh:mm');
    this.logs.push(log);
  }

  exportAuditHistory() {
    const today = moment().format('MM-DD-YY');

    this.excelService.exportAsExcelFile([], `portfolio_${today}`);
  }
}

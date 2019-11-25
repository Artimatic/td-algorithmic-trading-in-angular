import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { ExcelService } from './excel-service.service';

@Injectable()
export class ReportingService {
  public logs: any[];

  constructor(private excelService: ExcelService) {
    this.logs = [];
  }

  addAuditLog(symbol, message) {
    const currentTime = moment().format('DD.MM.YYYY hh:mm');
    const log = {time: currentTime, symbol: symbol, message: message};
    this.logs.push(log);
  }

  exportAuditHistory() {
    const today = moment().format('MM-DD-YY');
    console.log('printing logs: ', this.logs);
    this.excelService.exportAsExcelFile(this.logs, `logs_${today}`);
    this.clearLogs();
  }

  clearLogs() {
    this.logs = [];
  }
}

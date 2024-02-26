import { Injectable } from '@angular/core';
import { Stock } from '@shared/stock.interface';
import * as moment from 'moment';
import { ExcelService } from './excel-service.service';

@Injectable()
export class ReportingService {
  public logs = [];
  public backtestResults = [];

  constructor(private excelService: ExcelService) { }

  addAuditLog(symbol, message) {
    const currentTime = moment().format('DD.MM.YYYY hh:mm');
    const log = { time: currentTime, symbol: symbol, message: message };
    this.logs.push(log);
    return log;
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

  addBacktestResults(results: Stock, selectedColumns = []) {
    const buySignals = results.buySignals.reduce((previousValue, currentValue, currentIndex) => {
      return previousValue + currentValue + (currentIndex < results.buySignals.length - 1 ? ',' : '');
    }, '');

    const sellSignals = results.sellSignals.reduce((previousValue, currentValue, currentIndex) => {
      return previousValue + currentValue + (currentIndex < results.sellSignals.length - 1 ? ',' : '');
    }, '');

    let log = {
      'Stock': results.stock,
      'Buy': buySignals,
      'Sell': sellSignals,
      'Profitable Trades': results.profitableTrades,
      'Trades': results.totalTrades,
      'Returns': Math.round(results.returns * 100) + '%',
      'Implied Movement': Math.round(results.impliedMovement * 100) + '%',
      'Previous Implied Move': Math.round(results.previousImpliedMovement * 100) + '%',
      'Probability of Bear Profit': Math.round(results.bearishProbability * 100) + '%',
      'Probability of Bull Profit': Math.round(results.bullishProbability * 100) + '%',
      'Trade Size': Math.round(results.kellyCriterion * 100) + '%',
      'AI Prediction': JSON.stringify(results.ml)
    };
    if (selectedColumns.length > 0) {
      selectedColumns.forEach((column: {field: string, header: string}) => {
        if (!log[column.header]) {
          log[column.header] = results[column.field];
        }
      });
    }

    this.backtestResults.push(log);
    return log;
  }

  exportBacktestResults() {
    const today = moment().format('MM-DD-YY');

    this.excelService.exportAsExcelFile(this.backtestResults, `recommendation_${today}`);
    this.clearBacktestResults();
  }

  clearBacktestResults() {
    this.backtestResults = [];
  }
}

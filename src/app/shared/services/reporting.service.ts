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

  addBacktestResults(results: Stock) {
    const buySignals = results.buySignals.reduce((previousValue, currentValue, currentIndex) => {
      return previousValue + currentValue + (currentIndex < results.buySignals.length - 1 ? ',' : '');
    }, '');

    const sellSignals = results.sellSignals.reduce((previousValue, currentValue, currentIndex) => {
      return previousValue + currentValue + (currentIndex < results.sellSignals.length - 1 ? ',' : '');
    }, '');

    const log = {
      'Symbol': results.stock,
      'Buy Signals': buySignals,
      'Sell Signals': sellSignals,
      'Profitable Trades': results.profitableTrades,
      'Trades': results.totalTrades,
      'Returns': Math.round(results.returns * 100) + '%',
      'Implied Move': Math.round(results.impliedMovement * 100) + '%',
      'Previous Implied Move': Math.round(results.previousImpliedMovement * 100) + '%',
      'Bearish Probability': Math.round(results.bearishProbability * 100) + '%',
      'Bullish Probability': Math.round(results.bullishProbability * 100) + '%',
      'Trade Size': Math.round(results.kellyCriterion * 100) + '%'
    };
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

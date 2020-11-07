import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { SelectItem } from 'primeng/components/common/selectitem';
import * as _ from 'lodash';
import { BacktestService, IndicatorsService, PortfolioService, DaytradeService } from '@shared/services';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material';
import { ClientSmsService } from '@shared/services/client-sms.service';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import * as moment from 'moment-timezone';

@Component({
  selector: 'app-sms-card',
  templateUrl: './sms-card.component.html',
  styleUrls: ['./sms-card.component.css']
})
export class SmsCardComponent implements OnInit {
  @ViewChild('stepper', { static: false }) stepper;

  alive: boolean;

  firstFormGroup: FormGroup;
  stockFormControl: FormControl;
  maxMessages: FormControl;
  phoneNumber: FormControl;
  testing: FormControl;
  buySellOptions: SelectItem[];;
  buySellOption;

  interval = 60000;
  defaultInterval = 70800;
  tiles;
  error: string;
  startTime;
  stopTime;
  sub;
  messagesSent = 0;

  constructor(private backtestService: BacktestService,
    private portfolioService: PortfolioService,
    private daytradeService: DaytradeService,
    private indicatorsService: IndicatorsService,
    private clientSmsService: ClientSmsService,
    private globalSettingsService: GlobalSettingsService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.alive = true;

    this.buySellOption = new FormControl();
    this.buySellOption.setValue('none');

    this.phoneNumber = new FormControl();

    this.maxMessages = new FormControl(10, [
      Validators.required
    ]);

    this.stockFormControl = new FormControl('', [
      Validators.required
    ]);

    this.testing = new FormControl();

    this.buySellOptions = [
      { label: 'Buy and Sell', value: 'buy_sell' },
      { label: 'Sell Only', value: 'sell_only' },
      { label: 'Buy Only', value: 'buy_only' }
    ];

    this.setup();
  }

  goLive() {
    this.alive = true;
    this.stepper.next();
    this.interval = this.defaultInterval;
    this.messagesSent = 0;

    this.sub = TimerObservable.create(0, this.interval)
      .takeWhile(() => this.alive)
      .subscribe(async () => {
        this.interval = 900000;
        if (moment().isAfter(moment(this.startTime)) &&
          moment().isBefore(moment(this.stopTime))) {
          this.interval = this.defaultInterval;
          const data = await this.backtestService.getTdIntraday(this.stockFormControl.value)
            .toPromise()
            .then((intraday) => {
              return this.portfolioService.getPrice(this.stockFormControl.value)
                .toPromise()
                .then((quote) => {
                  return this.daytradeService.addQuote(intraday, quote);
                });
            })

          const timestamps = _.get(data, 'chart.result[0].timestamp');
          const dataLength = timestamps.length;
          const quotes = _.get(data, 'chart.result[0].indicators.quote[0]');

          if (dataLength > 80) {
            const lastIndex = dataLength - 1;
            const firstIndex = dataLength - 80;
            this.runStrategy(quotes, timestamps, firstIndex, lastIndex);
          }
        }

        if (moment().isAfter(moment(this.stopTime)) &&
          moment().isBefore(moment(this.stopTime).add(2, 'minutes'))) {
          this.stop();
        }
      });
  }

  async runStrategy(quotes, timestamps, firstIdx, lastIdx) {
    const { firstIndex, lastIndex } = this.daytradeService.findMostCurrentQuoteIndex(quotes.close, firstIdx, lastIdx);
    const close = quotes.close.slice(firstIndex, lastIndex + 1);
    const high = quotes.high.slice(firstIndex, lastIndex + 1);
    const low = quotes.low.slice(firstIndex, lastIndex + 1);
    const volume = quotes.volume.slice(firstIndex, lastIndex + 1);
    const indicatorQuotes = { close, high, low, volume };

    await this.indicatorsService.getIndicators(indicatorQuotes, 80, 2, 14, 70)
      .then(indicators => {
        this.backtestService.getDaytradeRecommendation(null, null, indicators, { minQuotes: 81 }).subscribe(
          analysis => {
            this.processAnalysis(analysis, quotes.close[lastIndex], timestamps[lastIndex]);
          },
          error => {
            this.error = 'Issue getting analysis.';
          }
        );
      });
  }

  async processAnalysis(analysis, price, time) {
    if (analysis.recommendation.toLowerCase() === 'buy' && (this.buySellOption.value === 'buy_sell' || this.buySellOption.value === 'buy_only')) {
      this.clientSmsService.sendBuySms(this.stockFormControl.value, this.phoneNumber.value, price, 1).subscribe(() => {
        this.messagesSent++;
      });
    } else if (analysis.recommendation.toLowerCase() === 'sell' && (this.buySellOption.value === 'buy_sell' || this.buySellOption.value === 'sell_only')) {
      this.clientSmsService.sendSellSms(this.stockFormControl.value, this.phoneNumber.value, price, 1).subscribe(() => {
        this.messagesSent++;
      });
    }
    if (this.messagesSent >= this.maxMessages.value) {
      this.stop();
    }
  }

  resetStepper(stepper) {
    stepper.selectedIndex = 0;
    this.stop();
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { title: 'Confirm', message: 'Are you sure you want to execute this order?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (this.sub) {
          this.sub.unsubscribe();
        }
        this.goLive();
      }
    });
  }

  setTest() {
    if (this.testing.value) {
      this.interval = 1000;
    }
  }

  setup() {
    this.interval = this.defaultInterval;
    this.messagesSent = 0;
    this.setDates();
  }

  stop() {
    this.alive = false;
    this.sub = null;
    this.setup();
  }

  setDates() {
    this.startTime = this.globalSettingsService.startTime;
    this.stopTime = this.globalSettingsService.stopTime;
  }
}

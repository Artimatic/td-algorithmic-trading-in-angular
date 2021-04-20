import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { GlobalSettingsService } from '../settings/global-settings.service';
import * as moment from 'moment-timezone';

@Component({
  selector: 'app-auto-backtest-switch',
  templateUrl: './auto-backtest-switch.component.html',
  styleUrls: ['./auto-backtest-switch.component.css']
})
export class AutoBacktestSwitchComponent implements OnInit {
  @Output() switchActivate: EventEmitter<any> = new EventEmitter();
  nextBacktestDate;
  checked = false;
  interval;
  timer;

  constructor(private globalSettingsService: GlobalSettingsService) { }

  ngOnInit() {
  }

  handleChange(e) {
    if (e.checked) {
      this.nextBacktestDate = this.getBacktestDateTime();
      this.timer = setTimeout(() => {
        this.switchActivate.emit(true);
      }, this.interval);
    } else {
      clearTimeout(this.timer);
      this.nextBacktestDate = null;
    }
  }

  getBacktestDateTime() {
    const nextDateTime = this.globalSettingsService.getNextTradeDate().add({ hour: 17 });
    this.interval = moment(nextDateTime).diff(moment().tz('America/New_York'), 'milliseconds');
    return nextDateTime.format('LLL');
  }
}

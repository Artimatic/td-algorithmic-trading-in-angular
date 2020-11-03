import { Component } from '@angular/core';
import { GlobalSettingsService, Brokerage } from '../global-settings.service';

@Component({
  selector: 'app-setting-controls',
  templateUrl: './setting-controls.component.html',
  styleUrls: ['./setting-controls.component.css']
})
export class SettingControlsComponent {
  ismeridian = true;
  constructor(public globalSettingsService: GlobalSettingsService) { }

  toggleMode(): void {
    this.ismeridian = !this.ismeridian;
  }

  toggleBrokerage(): void {
    if (this.globalSettingsService.brokerage === Brokerage.Robinhood) {
      this.globalSettingsService.brokerage = Brokerage.Td;
    } else if (this.globalSettingsService.brokerage === Brokerage.Td) {
      this.globalSettingsService.brokerage = Brokerage.Robinhood;
    }
  }

  toggleBacktesting(): void {
    this.globalSettingsService.backtesting = !this.globalSettingsService.backtesting;
  }

  toggleAutostart(): void {
    this.globalSettingsService.autostart = !this.globalSettingsService.autostart;
  }
}

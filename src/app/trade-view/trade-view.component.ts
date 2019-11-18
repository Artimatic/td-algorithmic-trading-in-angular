import { Component } from '@angular/core';
import { AuthenticationService } from '../shared';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-trade-view',
  templateUrl: './trade-view.component.html',
  styleUrls: ['./trade-view.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TradeViewComponent {
  isLinear = false;

  constructor(private authenticationService: AuthenticationService, public globalSettingsService: GlobalSettingsService) { }

  isAuthenticated() {
    return this.authenticationService.isAuthenticated();
  }
}

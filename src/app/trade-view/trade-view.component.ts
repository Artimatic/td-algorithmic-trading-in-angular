import { Component } from '@angular/core';
import { AuthenticationService } from '../shared';

@Component({
  selector: 'app-trade-view',
  templateUrl: './trade-view.component.html',
  styleUrls: ['./trade-view.component.css']
})
export class TradeViewComponent {
  isLinear = false;

  constructor(private authenticationService: AuthenticationService) { }

  isAuthenticated() {
    return this.authenticationService.isAuthenticated();
  }
}

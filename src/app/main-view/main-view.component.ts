import { Component } from '@angular/core';
import { AuthenticationService } from '../shared';

@Component({
  selector: 'app-main-view',
  templateUrl: './main-view.component.html',
  styleUrls: ['./main-view.component.css']
})
export class MainViewComponent {
  isLinear = false;

  constructor(private authenticationService: AuthenticationService) { }

  isAuthenticated() {
    return this.authenticationService.isAuthenticated();
  }
}

import { Component, OnInit } from '@angular/core';

import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/share';
import { BacktestService } from './shared';
import { ServiceStatus } from './shared/models/service-status';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  dataStatus: boolean;
  mlStatus: boolean;

  constructor(private backtestService: BacktestService) { }

  ngOnInit() {
    this.checkStatus();
  }

  checkStatus() {
    this.backtestService.pingGoliath().subscribe(
      (data: ServiceStatus) => {
        console.log('data service:', data);
        switch (data.status) {
          case 'UP':
            this.dataStatus = true;
            break;
          case 'DOWN':
            this.dataStatus = false;
            break;
        }
      },
      () => {
        this.dataStatus = false;
      });

    this.backtestService.pingArmidillo().subscribe(
      (data: ServiceStatus) => {
        console.log('ml service:', data);

        switch (data.status) {
          case 'UP':
            this.mlStatus = true;
            break;
          case 'DOWN':
            this.mlStatus = false;
            break;
        }
      },
      () => {
        this.mlStatus = false;
      });
  }
}

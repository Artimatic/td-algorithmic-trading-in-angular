import { Component, OnInit, AfterViewInit } from '@angular/core';

import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/share';
import { BacktestService, AuthenticationService } from './shared';
import { ServiceStatus } from './shared/models/service-status';
import { GlobalSettingsService } from './settings/global-settings.service';
import { GlobalTaskQueueService } from '@shared/services/global-task-queue.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  dataStatus: boolean;
  mlStatus: boolean;

  constructor(private backtestService: BacktestService,
    private authenticationService: AuthenticationService,
    private globalSettingsService: GlobalSettingsService,
    private globalTaskQueueService: GlobalTaskQueueService) { }

  ngOnInit() {
    this.checkStatus();
    this.globalSettingsService.initGlobalSettings();
    this.globalTaskQueueService.startTasks();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.authenticationService.retrieveLocalAccounts();
    }, 1000);
  }

  checkStatus() {
    this.backtestService.pingGoliath().subscribe(
      (data: ServiceStatus) => {
        if (data) {
          switch (data.status) {
            case 'UP':
              this.dataStatus = true;
              break;
            case 'DOWN':
              this.dataStatus = false;
              break;
          }
        }
      },
      () => {
        this.dataStatus = false;
      });

    this.backtestService.pingArmidillo().subscribe(
      (data: ServiceStatus) => {
        console.log('ml service:', data);
        if (data) {
          switch (data.status) {
            case 'UP':
              this.mlStatus = true;
              break;
            case 'DOWN':
              this.mlStatus = false;
              break;
          }
        }
      },
      () => {
        this.mlStatus = false;
      });
  }
}

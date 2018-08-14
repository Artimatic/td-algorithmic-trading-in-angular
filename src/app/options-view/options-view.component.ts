import { Component, OnInit } from '@angular/core';
import { BacktestService } from '../shared';
import * as moment from '../../../node_modules/moment';
import * as _ from 'lodash';

@Component({
  selector: 'app-options-view',
  templateUrl: './options-view.component.html',
  styleUrls: ['./options-view.component.css']
})
export class OptionsViewComponent implements OnInit {
  optionsChain: any;
  expirationDates: string[];
  constructor(private backtestService: BacktestService) { }

  ngOnInit() {
  }

  getChain() {
    this.backtestService.getOptionChain('AA').subscribe((chain) => {
      console.log('chain: ', chain);

      _.forEach(chain.result.expirationDates, (expiry: number) => {
        this.expirationDates.push(moment.unix(expiry).format());
      });
    });
  }

}

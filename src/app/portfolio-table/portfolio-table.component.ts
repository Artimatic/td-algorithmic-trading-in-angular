import { Component, OnInit, ViewChild } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {MatPaginator, MatSort, MatTableDataSource} from '@angular/material';
import {Observable} from 'rxjs/Observable';

import { PortfolioService } from '../shared/services/portfolio.service';
import { Holding } from '../shared/models';
@Component({
  selector: 'app-portfolio-table',
  templateUrl: './portfolio-table.component.html',
  styleUrls: ['./portfolio-table.component.css']
})
export class PortfolioTableComponent implements OnInit {
  portfolioData: Holding[];
  displayedColumns = ['instrument', 'quantity', 'average_buy_price', 'created_at', 'updated_at'];
  dataSource = new MatTableDataSource();

  resultsLength = 0;
  isLoadingResults = false;
  isRateLimitReached = false;

  constructor(
    private portfolioService: PortfolioService) { }

  ngOnInit() {
  }

  setData(data) {
    this.dataSource.data = data;
  }

}

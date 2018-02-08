import { AfterViewInit, ViewChild } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../shared/services/portfolio.service';
import { Holding } from '../shared/models';
import { PortfolioTableComponent } from '../portfolio-table/portfolio-table.component';
import { AuthenticationService } from '../shared/services/authentication.service';

@Component({
  selector: 'app-portfolio-view',
  templateUrl: './portfolio-view.component.html',
  styleUrls: ['./portfolio-view.component.css']
})
export class PortfolioViewComponent implements AfterViewInit {
  portfolioData: Holding[];
  @ViewChild(PortfolioTableComponent)
  private portfolioTableComponent: PortfolioTableComponent;

  constructor(
    private portfolioService: PortfolioService,
    private authenticationService: AuthenticationService) { }

  ngAfterViewInit() {
    this.refresh();
  }

  refresh() {
    this.authenticationService.getPortfolioAccount().subscribe(account => {
      this.portfolioService.getPortfolio()
        .subscribe(result => {
          this.portfolioTableComponent.setData(result);
        });
    })
  }
}

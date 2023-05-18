import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-portfolio-management',
  templateUrl: './portfolio-management.component.html',
  styleUrls: ['./portfolio-management.component.css']
})
export class PortfolioManagementComponent implements OnInit {
  steps: MenuItem[];
  activeIndex;
  constructor() { }

  ngOnInit() {
    this.steps = [{
      label: 'Review Holdings',
      command: () => {
        this.activeIndex = 0;
      }
    },
    {
      label: 'Find New Buys',
      command: () => {
        this.activeIndex = 1;
      }
    },
    {
      label: 'Determine Hedge',
      command: () => {
        this.activeIndex = 2;
      }
    },
    {
      label: 'Confirmation',
      command: () => {
        this.activeIndex = 3;
      }
    }];
    this.activeIndex = 0;
  }

  nextStep() {
    this.activeIndex++;
  }
}

import { TradeViewComponent } from './trade-view/trade-view.component';

import { Routes } from '@angular/router';
import { ResearchViewComponent } from './research-view/research-view.component';
import { OptionsViewComponent } from './options-view/options-view.component';
import { IntradayBacktestViewComponent } from './intraday-backtest-view/intraday-backtest-view.component';
import { StocklistComponent } from './stocklist/stocklist.component';
import { PortfolioManagementComponent } from './portfolio-management/portfolio-management.component';

export const routes: Routes = [
  {
    path: 'trade-view',
    component: TradeViewComponent
  },
  {
    path: 'research',
    component: ResearchViewComponent
  },
  {
    path: 'options',
    component: OptionsViewComponent
  },
  {
    path: 'deep-analysis',
    loadChildren: './machine-learning/machine-learning.module#MachineLearningModule'
  },
  {
    path: 'backtest',
    component: IntradayBacktestViewComponent
  },
  {
    path: 'stock-list',
    component: StocklistComponent
  },
  {
    path: 'portfolio-managment',
    component: PortfolioManagementComponent
  },
  {
    path: '**',
    redirectTo: '/trade-view',
    pathMatch: 'full'
  }
];

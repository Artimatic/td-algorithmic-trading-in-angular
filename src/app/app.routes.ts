import { MainViewComponent } from './main-view/main-view.component';

import { Routes, Route, ActivatedRouteSnapshot } from '@angular/router';
import { ResearchViewComponent } from './research-view/research-view.component';
import { OptionsViewComponent } from './options-view/options-view.component';
import { TimelineViewComponent } from './timeline-view/timeline-view.component';
import { BacktestViewComponent } from './backtest-view/backtest-view.component';

export const routes: Routes = [
  {
    path: 'home',
    component: MainViewComponent
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
    path: 'timeline',
    component: TimelineViewComponent
  },
  {
    path: 'backtest',
    component: BacktestViewComponent
  },
  {
    path: '**',
    redirectTo: '/home',
    pathMatch: 'full'
  }
];

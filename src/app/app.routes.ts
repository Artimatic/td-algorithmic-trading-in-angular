import { BulkBacktestComponent } from './bulk-backtest';

import { Routes, Route, ActivatedRouteSnapshot } from '@angular/router';

export const routes: Routes = [
  {
    path: 'console',
    component: BulkBacktestComponent
  },
  {
    path: '**',
    redirectTo: '/console',
    pathMatch: 'full'
  }
];

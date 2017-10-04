import { BulkBacktestComponent } from './bulk-backtest';

import { Routes, Route, ActivatedRouteSnapshot } from '@angular/router';

export const routes: Routes = [
  {
    path: 'bulk',
    component: BulkBacktestComponent
  },
  {
    path: '**',
    redirectTo: '/bulk',
    pathMatch: 'full'
  }
];

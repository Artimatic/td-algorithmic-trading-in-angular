import { MainViewComponent } from './main-view/main-view.component';

import { Routes, Route, ActivatedRouteSnapshot } from '@angular/router';

export const routes: Routes = [
  {
    path: 'console',
    component: MainViewComponent
  },
  {
    path: '**',
    redirectTo: '/console',
    pathMatch: 'full'
  }
];

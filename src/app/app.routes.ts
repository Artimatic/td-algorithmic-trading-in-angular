import { MainViewComponent } from './main-view/main-view.component';

import { Routes, Route, ActivatedRouteSnapshot } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    component: MainViewComponent
  },
  {
    path: '**',
    redirectTo: '/home',
    pathMatch: 'full'
  }
];

import { MainViewComponent } from './main-view/main-view.component';

import { Routes, Route, ActivatedRouteSnapshot } from '@angular/router';
import { ResearchViewComponent } from './research-view/research-view.component';

export const routes: Routes = [
  {
    path: 'research',
    component: ResearchViewComponent
  },
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

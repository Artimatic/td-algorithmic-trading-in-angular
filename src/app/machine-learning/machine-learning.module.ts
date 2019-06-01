import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrecogComponent } from './precog/precog.component';
import { MachineLearningPageComponent } from './machine-learning-page/machine-learning-page.component';
import { BacktestService } from '../shared';
import { MatSnackBarModule, MatCardModule, MatFormFieldModule, MatGridListModule, MatProgressSpinnerModule, MatInputModule, MatExpansionModule } from '@angular/material';
import { ChartModule } from 'angular-highcharts';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { TimelineViewComponent } from './timeline-view/timeline-view.component';
import { MlCardComponent } from './ml-card/ml-card.component';

const routes: Routes =
  [
    {
      path: 'timeline', component: TimelineViewComponent
    }
  ];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatSnackBarModule,
    ChartModule,
    FormsModule,
    MatCardModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatGridListModule,
    MatProgressSpinnerModule,
    MatExpansionModule
  ],
  declarations: [
    TimelineViewComponent,
    PrecogComponent,
    MachineLearningPageComponent,
    MlCardComponent
  ],
  exports: [
    MachineLearningPageComponent,
    MlCardComponent
  ],
  providers: [
    BacktestService
  ],
})
export class MachineLearningModule { }

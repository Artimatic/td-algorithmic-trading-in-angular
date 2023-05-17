import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrecogComponent } from './precog/precog.component';
import { MachineLearningPageComponent } from './machine-learning-page/machine-learning-page.component';
import { BacktestService } from '../shared';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { ChartModule } from 'angular-highcharts';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { TimelineViewComponent } from './timeline-view/timeline-view.component';
import { AskModelComponent } from './ask-model/ask-model.component';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SharedModule } from '../shared/shared.module';
import { MlTimeperiodsComponent } from './ml-timeperiods/ml-timeperiods.component';

const routes: Routes =
  [
    {
      path: 'machine-learning', component: MachineLearningPageComponent
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
    MatExpansionModule,
    ButtonModule,
    DropdownModule,
    CardModule,
    TableModule,
    ProgressSpinnerModule,
    SharedModule
  ],
  declarations: [
    TimelineViewComponent,
    PrecogComponent,
    MachineLearningPageComponent,
    AskModelComponent,
    MlTimeperiodsComponent,
  ],
  exports: [
    MachineLearningPageComponent,
  ],
  providers: [
    BacktestService
  ],
})
export class MachineLearningModule { }

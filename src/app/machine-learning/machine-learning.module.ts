import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrecogComponent } from './precog/precog.component';
import { MachineLearningPageComponent } from './machine-learning-page/machine-learning-page.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [PrecogComponent, MachineLearningPageComponent],
  exports: [
    MachineLearningPageComponent
  ]
})
export class MachineLearningModule { }

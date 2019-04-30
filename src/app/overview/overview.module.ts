import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TodoListComponent } from './todo-list/todo-list.component';
import { OverviewComponent } from './overview.component';
import { MatGridListModule, MatCardModule, MatListModule, MatCheckboxModule } from '@angular/material';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [TodoListComponent, OverviewComponent],
  imports: [
    CommonModule,
    MatGridListModule,
    MatCardModule,
    MatListModule,
    MatCheckboxModule,
    FormsModule,
  ],
  exports: [TodoListComponent]
})
export class OverviewModule { }

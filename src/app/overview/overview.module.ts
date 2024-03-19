import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TodoListComponent } from './todo-list/todo-list.component';
import { OverviewComponent } from './overview.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { LoginComponent } from '../login/login.component';
import { CheckboxModule } from 'primeng/checkbox';

@NgModule({
  declarations: [TodoListComponent, OverviewComponent, LoginComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    CheckboxModule
  ],
  exports: [TodoListComponent, LoginComponent]
})
export class OverviewModule { }

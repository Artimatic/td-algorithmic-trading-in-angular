import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import {InputSwitchModule} from 'primeng/inputswitch';

import { TableModule } from 'primeng/table';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ListboxModule } from 'primeng/listbox';
import { DialogModule } from 'primeng/dialog';
import { SpinnerModule } from 'primeng/spinner';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MiniCardComponent } from '../mini-card/mini-card.component';
import { DefaultOrderListsComponent } from '../default-order-lists/default-order-lists.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StepsModule } from 'primeng/steps';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MenubarModule } from 'primeng/menubar';
import { DataViewModule } from 'primeng/dataview';
import {FieldsetModule} from 'primeng/fieldset';

const materialModules = [
  MatStepperModule,
  MatCardModule,
  MatIconModule,
  MatMenuModule,
  MatFormFieldModule,
  MatExpansionModule,
  MatGridListModule,
  MatTooltipModule,
  MatSelectModule,
  MatListModule,
  MatTabsModule,
  MatProgressBarModule,
  MatSidenavModule,
  MatChipsModule,
  MatDialogModule,
  MatCheckboxModule,
  MatInputModule
];

const primeModules = [
  MenubarModule,
  TableModule,
  MultiSelectModule,
  SelectButtonModule,
  ListboxModule,
  DialogModule,
  CardModule,
  ButtonModule,
  SplitButtonModule,
  DialogModule,
  ListboxModule,
  SpinnerModule,
  DropdownModule,
  MessagesModule,
  MessageModule,
  StepsModule,
  ChartModule,
  ProgressSpinnerModule,
  InputSwitchModule,
  DataViewModule,
  FieldsetModule
];

@NgModule({
  imports: [CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...materialModules, ...primeModules],
  exports: [
    ...materialModules,
    ...primeModules,
    MiniCardComponent,
    DefaultOrderListsComponent,
  ],
  declarations: [
    MiniCardComponent,
    DefaultOrderListsComponent,
  ]
})
export class SharedModule {
}

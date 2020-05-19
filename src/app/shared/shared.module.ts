import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';

import {
  MatMenuModule,
  MatToolbarModule,
  MatIconModule,
  MatCardModule,
  MatProgressSpinnerModule,
  MatProgressBarModule,
  MatGridListModule,
  MatButtonModule,
  MatSidenavModule,
  MatExpansionModule,
  MatTableModule,
  MatCheckboxModule,
  MatRadioModule,
  MatDialogModule,
  MatFormFieldModule,
  MatInputModule,
  MatSnackBarModule,
  MatTabsModule,
  MatListModule,
  MatChipsModule,
  MatStepperModule,
  MatSelectModule,
  MatTooltipModule,
  MatSlideToggleModule,
} from '@angular/material';

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

const materialModules = [
  MatMenuModule,
  MatToolbarModule,
  MatIconModule,
  MatCardModule,
  MatProgressSpinnerModule,
  MatProgressBarModule,
  MatGridListModule,
  MatButtonModule,
  MatSidenavModule,
  MatExpansionModule,
  MatTableModule,
  MatCheckboxModule,
  MatRadioModule,
  MatDialogModule,
  MatFormFieldModule,
  MatInputModule,
  MatSnackBarModule,
  MatTabsModule,
  MatListModule,
  MatChipsModule,
  MatStepperModule,
  MatSelectModule,
  MatTooltipModule,
  MatSlideToggleModule,
];

const primeModules = [
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

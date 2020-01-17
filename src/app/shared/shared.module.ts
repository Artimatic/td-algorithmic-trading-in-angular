import { NgModule } from '@angular/core';

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
  TableModule,
  MultiSelectModule,
  SelectButtonModule,
  ListboxModule,
];

@NgModule({
  imports: materialModules,
  exports: materialModules
})
export class SharedModule {
}

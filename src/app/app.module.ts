import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule, NavigationError } from '@angular/router';
import { ChartModule } from 'angular-highcharts';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import 'hammerjs';
import {
  MatMenuModule,
  MatToolbarModule,
  MatIconModule,
  MatCardModule,
  MatProgressSpinnerModule,
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
} from '@angular/material';

import {FlexLayoutModule} from '@angular/flex-layout';

import { routes } from './app.routes';
import { AppComponent } from './app.component';
import { BulkBacktestComponent } from './bulk-backtest';
import { XlsImportComponent } from './xls-import/xls-import.component';
import { RhTableComponent } from './rh-table';
import { BacktestService, AuthenticationService } from './shared';
import { ChartDialogComponent } from './chart-dialog';

import { RhInputComponent } from './rh-input/rh-input.component';
import { ProductViewComponent } from './product-view/product-view.component';
import { LoginComponent } from './login/login.component';
import { LoginDialogComponent } from './login-dialog/login-dialog.component';


@NgModule({
  declarations: [
    AppComponent,
    BulkBacktestComponent,
    XlsImportComponent,
    RhTableComponent,
    ChartDialogComponent,
    RhInputComponent,
    ProductViewComponent,
    LoginComponent,
    LoginDialogComponent,
  ],
  entryComponents: [
    ChartDialogComponent,
    LoginDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    RouterModule.forRoot(routes, {
      enableTracing: true
    }),
    MatMenuModule,
    MatToolbarModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    MatButtonModule,
    MatSidenavModule,
    MatExpansionModule,
    MatTableModule,
    FlexLayoutModule,
    MatCheckboxModule,
    MatRadioModule,
    MatDialogModule,
    ChartModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  providers: [
    BacktestService,
    AuthenticationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }


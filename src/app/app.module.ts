import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';
import { ChartModule } from 'angular-highcharts';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import 'hammerjs';
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
} from '@angular/material';

import { FlexLayoutModule } from '@angular/flex-layout';

import { routes } from './app.routes';
import { AppComponent } from './app.component';
import { BulkBacktestComponent } from './bulk-backtest';
import { XlsImportComponent } from './xls-import/xls-import.component';
import { RhTableComponent } from './rh-table';
import {
  BacktestService,
  AuthenticationService,
  PortfolioService,
  DaytradeService,
  ReportingService,
  ScoreKeeperService,
  IndicatorsService,
  AlgoService,
} from './shared';

import { RhInputComponent } from './rh-input/rh-input.component';
import { ProductViewComponent } from './product-view/product-view.component';
import { LoginComponent } from './login/login.component';
import { LoginDialogComponent } from './login-dialog/login-dialog.component';
import { MainViewComponent } from './main-view/main-view.component';
import { PortfolioTableComponent } from './portfolio-table/portfolio-table.component';
import { PortfolioViewComponent } from './portfolio-view/portfolio-view.component';
import { InstrumentPipe } from './shared/pipes/instrument.pipe';
import { OrderDialogComponent } from './order-dialog/order-dialog.component';
import { CartService } from './shared/services/cart.service';
import { ExcelService } from './shared/services/excel-service.service';
import { ShoppingListComponent } from './shopping-list/shopping-list.component';
import { BbCardComponent } from './bb-card/bb-card.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { ReportingComponent, ReportDialogComponent } from './reporting/reporting.component';
import { ResearchViewComponent } from './research-view/research-view.component';
import { OptionsViewComponent } from './options-view/options-view.component';
import { ScoreBoardComponent } from './score-board/score-board.component';
import { TimelineViewComponent } from './timeline-view/timeline-view.component';
import { BacktestViewComponent } from './backtest-view/backtest-view.component';
import { TerminalViewComponent } from './terminal-view/terminal-view.component';

@NgModule({
  declarations: [
    AppComponent,
    BulkBacktestComponent,
    XlsImportComponent,
    RhTableComponent,
    RhInputComponent,
    ProductViewComponent,
    LoginComponent,
    LoginDialogComponent,
    MainViewComponent,
    PortfolioTableComponent,
    PortfolioViewComponent,
    InstrumentPipe,
    OrderDialogComponent,
    ShoppingListComponent,
    BbCardComponent,
    ConfirmDialogComponent,
    ReportingComponent,
    ReportDialogComponent,
    ResearchViewComponent,
    OptionsViewComponent,
    ScoreBoardComponent,
    TimelineViewComponent,
    BacktestViewComponent,
    TerminalViewComponent,
  ],
  entryComponents: [
    LoginDialogComponent,
    OrderDialogComponent,
    ConfirmDialogComponent,
    ReportDialogComponent
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
    MatProgressBarModule,
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
    MatSnackBarModule,
    MatTabsModule,
    MatListModule,
    MatChipsModule,
    MatStepperModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  providers: [
    BacktestService,
    AuthenticationService,
    PortfolioService,
    CartService,
    ExcelService,
    DaytradeService,
    ReportingService,
    ScoreKeeperService,
    IndicatorsService,
    AlgoService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

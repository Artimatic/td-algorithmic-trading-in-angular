import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ChartModule } from 'angular-highcharts';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import 'hammerjs';
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
  TradeService
} from './shared';

import { RhInputComponent } from './rh-input/rh-input.component';
import { ProductViewComponent } from './product-view/product-view.component';
import { LoginDialogComponent } from './login-dialog/login-dialog.component';
import { TradeViewComponent } from './trade-view/trade-view.component';
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
import { IntradayBacktestViewComponent } from './intraday-backtest-view/intraday-backtest-view.component';
import { TerminalViewComponent } from './terminal-view/terminal-view.component';
import { SimpleCardComponent } from './simple-card/simple-card.component';
import { OverviewModule } from './overview/overview.module';
import { SettingsModule } from './settings/settings.module';
import { MachineLearningModule } from './machine-learning/machine-learning.module';
import { MlCardComponent } from './ml-card/ml-card.component';
import { TestResultsTableComponent } from './test-results-table/test-results-table.component';
import { ChartDialogComponent } from './chart-dialog/chart-dialog.component';
import { HeaderComponent } from './header/header.component';
import { SharedModule } from './shared/shared.module';
import { RedirectLoginDialogComponent } from './redirect-login-dialog/redirect-login-dialog.component';
import { NeuroCardComponent } from './neuro-card/neuro-card.component';
import { DaytradeScoreBoardComponent } from './daytrade-score-board/daytrade-score-board.component';
import { PokerhandComponent } from './pokerhand/pokerhand.component';

import { MlBatchCardComponent } from './ml-batch-card/ml-batch-card.component';

import { EasyOrdersEditorComponent } from './easy-orders-editor/easy-orders-editor.component';
import { StocklistCleanupComponent } from './stocklist-cleanup/stocklist-cleanup.component';
import { StocklistComponent } from './stocklist/stocklist.component';
import { PortfolioManagementComponent } from './portfolio-management/portfolio-management.component';
import { PortfolioInfoComponent } from './portfolio-info/portfolio-info.component';

@NgModule({
  declarations: [
    AppComponent,
    BulkBacktestComponent,
    XlsImportComponent,
    RhTableComponent,
    RhInputComponent,
    ProductViewComponent,
    LoginDialogComponent,
    TradeViewComponent,
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
    IntradayBacktestViewComponent,
    TerminalViewComponent,
    SimpleCardComponent,
    MlCardComponent,
    TestResultsTableComponent,
    ChartDialogComponent,
    HeaderComponent,
    RedirectLoginDialogComponent,
    NeuroCardComponent,
    DaytradeScoreBoardComponent,
    PokerhandComponent,
    MlBatchCardComponent,
    EasyOrdersEditorComponent,
    StocklistCleanupComponent,
    StocklistComponent,
    PortfolioManagementComponent,
    PortfolioInfoComponent,
  ],
  entryComponents: [
    LoginDialogComponent,
    OrderDialogComponent,
    ConfirmDialogComponent,
    ReportDialogComponent,
    ChartDialogComponent,
    RedirectLoginDialogComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    ChartModule,
    FlexLayoutModule,
    OverviewModule,
    SettingsModule,
    MachineLearningModule,
    SharedModule,
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
    TradeService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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

import { routes } from './app.routes';
import { BulkBacktestComponent } from './bulk-backtest';
import { XlsImportComponent } from './xls-import/xls-import.component';
import { RhTableComponent } from './rh-table';
import {
  BacktestService,
  AuthenticationService,
  PortfolioService,
  DaytradeService,
  ReportingService,
  ScoreKeeperService
} from './shared';

import { RhInputComponent } from './rh-input/rh-input.component';
import { ProductViewComponent } from './product-view/product-view.component';
import { LoginComponent } from './login/login.component';
import { LoginDialogComponent } from './login-dialog/login-dialog.component';
import { TradeViewComponent } from './trade-view/trade-view.component';
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

import { APP_BASE_HREF } from '@angular/common';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        BulkBacktestComponent,
        XlsImportComponent,
        RhTableComponent,
        RhInputComponent,
        ProductViewComponent,
        LoginComponent,
        LoginDialogComponent,
        TradeViewComponent,
        InstrumentPipe,
        OrderDialogComponent,
        ShoppingListComponent,
        BbCardComponent,
        ConfirmDialogComponent,
        ReportingComponent,
        ReportDialogComponent,
        ResearchViewComponent,
        OptionsViewComponent,
      ],
      imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
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
        { provide: APP_BASE_HREF, useValue : '/' },
      ]
    }).compileComponents();
  }));
  xit('createshould create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
  it(`should have as title 'app'`, async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('app');
  }));
  xit('createshould render title in a h1 tag', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('Welcome to app!');
  }));
});

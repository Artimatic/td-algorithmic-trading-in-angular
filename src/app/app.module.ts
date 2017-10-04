import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule, NavigationError } from '@angular/router';

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
} from '@angular/material';

import { routes } from './app.routes';
import { AppComponent } from './app.component';
import { BulkBacktestComponent } from './bulk-backtest';

@NgModule({
  declarations: [
    AppComponent,
    BulkBacktestComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
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
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }


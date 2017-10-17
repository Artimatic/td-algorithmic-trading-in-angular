import {Component} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {DataSource} from '@angular/cdk/collections';
import { Stock } from '../shared';


export class RhDataSource extends DataSource<any> {
  constructor(private data: Stock[]) {
    super();
  }

  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<Stock[]> {
    return Observable.of(this.data);
  }

  disconnect() {}
}

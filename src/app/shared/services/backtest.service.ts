import { Http } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import {
  Stock
} from './../../shared';

import { environment } from '../../../environments/environment';

const BASE_URL = environment.appUrl;

@Injectable()
export class BacktestService {

  constructor(private http: Http) { }

    getClasses(): Observable<Array<Stock>> {
      return this.http.get(`${BASE_URL}/classes`)
        .map(res => res.json());
    }

    getClass(id: number): Observable<Stock> {
      return this.http.get(`${BASE_URL}/classes/${id}`)
        .map(res => res.json());
    }

    getDescriptions(id: number): Observable<Array<Stock>> {
      return this.http.get(`${BASE_URL}/descriptions`)
        .map(r => r.json())
        .map(x => {
          return x.filter(n => n['class_id'] == id);
        });
    }
}

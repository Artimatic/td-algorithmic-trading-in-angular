import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE_URL = environment.appUrl;

@Injectable({
  providedIn: 'root'
})
export class DailyBacktestService {

  constructor(private http: HttpClient) { }

  getSignalScores(signals: any): Observable<any> {

    const data = {
      signals
    };

    return this.http.post(`${BASE_URL}api/backtest/score-signals`, data, {});
  }
}

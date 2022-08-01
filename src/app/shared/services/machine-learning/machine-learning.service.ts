import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const BASE_URL = environment.appUrl;

@Injectable({
  providedIn: 'root'
})
export class MachineLearningService {

  constructor(private http: HttpClient) { }

  trainPredictNext30(symbol: string,
    endDate: string = null,
    startDate: string = null,
    trainingSize: number,
    features: number[] = []): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol,
        startDate,
        endDate,
        trainingSize: String(trainingSize),
        features: null
      }
    };

    if (features) {
      options.params.features = String(features);
    }
    return this.http.get(`${BASE_URL}api/machine-learning/v3/train`,
      options);
  }

  activate(symbol: string,
    features: number[] = []): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol,
        features: null
      }
    };

    if (features) {
      options.params.features = String(features);
    }

    return this.http.get(`${BASE_URL}api/machine-learning/v3/activate`, options);
  }

  activateBuyAtCloseModel(symbol, startDate, inputData): Observable<any> {
    const data = {
      symbol,
      startDate,
      inputData
    };

    return this.http.post(`${BASE_URL}api/machine-learning/activate-at-close-model`, data, {});
  }

  getQuotes(symbol: string, startDate: string, endDate: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol,
        startDate,
        endDate
      }
    };

    return this.http.get(`${BASE_URL}api/machine-learning/v3/quotes`, options);
  }

  getIndicators(quotes: any): Observable<any> {

    const data = {
      quotes
    };

    return this.http.post(`${BASE_URL}api/machine-learning/v3/indicators`, data, {});
  }

  activateModel(symbol: string, indicatorData: any, features: number[] = []): Observable<any> {

    const data = {
      symbol,
      indicatorData: indicatorData,
      features: String(features)
    };

    return this.http.post(`${BASE_URL}api/machine-learning/v3/activate-model`, data, {});
  }

  trainPredictDailyV4(symbol: string,
    endDate: string = null,
    startDate: string = null,
    trainingSize: number,
    features: number[] = [],
    range: number,
    limit: number): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol,
        startDate,
        endDate,
        trainingSize: String(trainingSize),
        features: null,
        range: String(range),
        limit: String(limit)
      }
    };

    if (features) {
      options.params.features = String(features);
    }
    return this.http.get(`${BASE_URL}api/machine-learning/v4/train-daily`,
      options);
  }

  activateDailyV4(symbol: string,
    features: number[] = [],
    range: number,
    limit: number): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol,
        features: null,
        range: String(range),
        limit: String(limit)
      }
    };

    if (features) {
      options.params.features = String(features);
    }

    return this.http.get(`${BASE_URL}api/machine-learning/v4/activate-daily`, options);
  }

  scoreDailyV4(symbol: string,
    endDate: string = null,
    startDate: string = null): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol,
        startDate,
        endDate
      }
    };
    return this.http.get(`${BASE_URL}api/machine-learning/v4/score-daily`, options);
  }
}

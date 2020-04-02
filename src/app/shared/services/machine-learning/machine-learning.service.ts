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

  activate(symbol: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const options = {
      headers: headers,
      params: {
        symbol
      }
    };
    return this.http.get(`${BASE_URL}api/machine-learning/v3/activate`, options);
  }
}

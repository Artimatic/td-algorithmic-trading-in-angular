import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OptionsDataService {

  constructor(private http: HttpClient) { }

  getImpliedMove(symbol: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    const options = {
      headers,
      params: {
        symbol,
        strikeCount: '4',
        optionType: 'S'
      }
    };

    return this.http.get('/api/options/implied-move', options);  }

}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE_URL = environment.appUrl;

@Injectable({
  providedIn: 'root'
})
export class ClientSmsService {

  constructor(private http: HttpClient) { }

  sendBuySms(symbol: string, phoneNumber: string, price: number, quantity: number): Observable<any> {
    const data = {
      phone: phoneNumber,
      stock: symbol,
      price,
      quantity
    };

    return this.http.post(`${BASE_URL}api/sms/buy`, data, {});
  }

  sendSellSms(symbol: string, phoneNumber: string, price: number, quantity: number): Observable<any> {
    const data = {
      phone: phoneNumber,
      stock: symbol,
      price,
      quantity
    };

    return this.http.post(`${BASE_URL}api/sms/sell`, data, {});
  }
}

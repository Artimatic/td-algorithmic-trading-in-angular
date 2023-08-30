import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DaytradeManagerService {
  allocationSizes = [0.05, 0.1, 0.25, 0.5];
  alive = false;
  ordersCount = 1;
  constructor() { }

  initialize() {

  }

  executeDaytrade() {}

  trimLosers() {

  }
}

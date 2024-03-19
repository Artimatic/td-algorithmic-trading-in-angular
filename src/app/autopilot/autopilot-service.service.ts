import { Injectable } from '@angular/core';
import { DaytradeAlgorithms } from '@shared/enums/daytrade-algorithms.enum';

@Injectable({
  providedIn: 'root'
})
export class AutopilotServiceService {
  localStorageKey = 'autopilot_settings';
  algorithmList = [
    DaytradeAlgorithms.DayTrade,
    DaytradeAlgorithms.Buy,
    DaytradeAlgorithms.BuyNearOpen,
    DaytradeAlgorithms.BuyNearClose
  ];
  constructor() { }

  getValue() {
    return JSON.parse(localStorage.getItem(this.localStorageKey));
  }

  getSetting(key: string) {
    const storage = JSON.parse(localStorage.getItem(this.localStorageKey));
    if (storage && storage[key]) {
      return storage[key];
    }
    return null;
  }

  saveSetting(key: string, value: any) {
    let storage = JSON.parse(localStorage.getItem(this.localStorageKey));
    if (storage) {
      storage[key] = value;
    } else {
      storage = { key: value };
    }
    localStorage.setItem(this.localStorageKey, JSON.stringify(storage));
  }
}

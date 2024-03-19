import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalPreferences {
  constructor() { }

  setLocalStorage(storageKey: string, preferenceKey: string, preferenceObj: any) {
    const mlBuyAtCloseServicePref = JSON.parse(localStorage.getItem(storageKey));
    if (mlBuyAtCloseServicePref) {
      mlBuyAtCloseServicePref[preferenceKey] = preferenceObj;
      localStorage.setItem(storageKey, JSON.stringify(mlBuyAtCloseServicePref));
    } else {
      const newStorageObj = {};
      newStorageObj[preferenceKey] = true;
      localStorage.setItem(preferenceObj, JSON.stringify(newStorageObj));
    }
  }
}

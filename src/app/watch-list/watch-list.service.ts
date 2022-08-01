import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WatchListService {
  public watchList = [];
  constructor() {
    if (sessionStorage.getItem('watchList')) {
      const savedList = JSON.parse(sessionStorage.getItem('watchList'));
      this.watchList = savedList;
    }
  }

  saveWatchList() {
    sessionStorage.setItem('watchList', JSON.stringify(this.watchList));
  }

  addWatchItem(stock: string, phoneNumber: string) {
    this.watchList.push({ stock, phoneNumber });
    this.saveWatchList();
  }

  removeWatchItem(stock: string, phoneNumber: string) {
    const index = this.watchList.findIndex(item => {
      if (item.stock === stock && item.phoneNumber === phoneNumber) {
        return true;
      }
      return false;
    });
    this.watchList.splice(index, 1);
    this.saveWatchList();
  }

  removeAll() {
    this.watchList = [];
    this.saveWatchList();
  }
}

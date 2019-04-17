import { Injectable } from '@angular/core';
import * as _ from 'lodash';

@Injectable()
export class AlgoService {

  constructor() { }

  isOversoldBullish(roc: any[], momentum: number, mfi: number): boolean {
    const rocLen = roc[0].length - 1;
    const roc1 = _.round(roc[0][rocLen], 3);
    let num, den;
    if (momentum > roc1) {
      num = momentum;
      den = roc1;
    } else {
      den = momentum;
      num = roc1;
    }

    const momentumDiff = _.round(_.divide(num, den), 3);
    const rocDiffRange = [-0.4, 0.1];

    if (momentumDiff < rocDiffRange[0] || momentumDiff > rocDiffRange[1]) {
      if (mfi < 10) {
        return true;
      }
    }
    return false;
  }


  isMomentumBullish(price: number, high: number, mfi: number, roc: any[], momentum: number): boolean {
    const rocLen = roc[0].length - 1;
    const roc1 = _.round(roc[0][rocLen], 3);
    let num, den;
    if (momentum > roc1) {
      num = momentum;
      den = roc1;
    } else {
      den = momentum;
      num = roc1;
    }

    const momentumDiff = _.round(_.divide(num, den), 3);
    const rocDiffRange = [0, 0.7];

    if (momentumDiff > rocDiffRange[1]) {
      if (price >= high) {
        if (mfi > 55 && mfi < 80) {
          return true;
        }
      }
    }
    return false;
  }

  isBBandMeanReversionBullish(price: number, low: number, mfi: number, roc: any[], momentum: number): boolean {
    const rocLen = roc[0].length - 1;
    const roc1 = _.round(roc[0][rocLen], 4);
    let num, den;
    if (momentum > roc1) {
      num = momentum;
      den = roc1;
    } else {
      den = momentum;
      num = roc1;
    }

    const momentumDiff = _.round(_.divide(num, den), 4);
    const rocDiffRange = [-0.4, 0.7];

    if (momentumDiff < rocDiffRange[0] || momentumDiff > rocDiffRange[1]) {
      if (price <= low) {
        if (mfi > 0 && mfi < 38) {
          return true;
        }
      }
    }
    return false;
  }
}

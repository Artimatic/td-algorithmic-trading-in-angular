import { Injectable } from '@angular/core';
import * as _ from 'lodash';

@Injectable()
export class AlgoService {

  constructor() { }

  isOversoldBullish(roc10: number, momentum: number, mfi: number): boolean {
    const momentumDiff = _.round(_.divide(momentum, roc10), 3);
    const rocDiffRange = [-0.5, 0.6];

    if (momentumDiff < rocDiffRange[0] || momentumDiff > rocDiffRange[1]) {
      if (mfi < 10) {
        return true;
      }
    }
    return false;
  }


  isMomentumBullish(price: number, mid: number, mfi: number, roc10: number, momentum: number): boolean {
    const momentumDiff = _.round(_.divide(momentum, roc10), 3);
    const rocDiffRange = [-0.5, 0.6];

    if (momentumDiff > rocDiffRange[1]) {
      if (price >= mid) {
        if (mfi > 55 && mfi < 80) {
          return true;
        }
      }
    }
    return false;
  }

  isBBandMeanReversionBullish(price: number, low: number, mfi: number, roc10: number, momentum: number): boolean {
    const momentumDiff = _.round(_.divide(momentum, roc10), 4);
    const rocDiffRange = [-0.4, 0.6];

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

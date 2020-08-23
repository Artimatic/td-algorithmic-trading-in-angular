import * as _ from 'lodash';
import * as tulind from 'tulind';

class MfiService {
  getMfiLow(highs: number[],
    lows: number[],
    reals: number[],
    volumes: number[],
    period: number) {
    let mfiLow = 80;
    for (let i = 0; i < volumes.length - period; i++) {
      const highSubarray = highs.slice(i, i + period);
      const lowSubarray = lows.slice(i, i + period);
      const realSubarray = reals.slice(i, i + period);
      const volumeSubarray = volumes.slice(i, i + period);
      const mfi = this.getMfi(highSubarray, lowSubarray, realSubarray, volumeSubarray, period);
      console.log('mfi len: ', highSubarray.length, lowSubarray.length, realSubarray.length, volumeSubarray.length);
      if (mfi < mfiLow) {
        mfiLow = mfi;
      }
    }
  }

  getMfi(high, low, close, volume, period) {
    return tulind.indicators.mfi.indicator([high, low, close, volume], [period]);
  }
}

export default new MfiService();

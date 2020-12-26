import * as _ from 'lodash';
import * as tulind from 'tulind';

class MfiService {
  async getMfiLow(highs: number[],
    lows: number[],
    reals: number[],
    volumes: number[],
    period: number) {
    let mfiLow = 80;
    for (let i = 1; i < volumes.length - period; i++) {
      const highSubarray = highs.slice(i - 1, i + period);
      const lowSubarray = lows.slice(i - 1, i + period);
      const realSubarray = reals.slice(i - 1, i + period);
      const volumeSubarray = volumes.slice(i - 1, i + period);
      const mfi = await this.getMfi(highSubarray, lowSubarray, realSubarray, volumeSubarray, period);
      const mfiLeft = _.round(mfi[0][mfi[0].length - 1], 3);
      if (mfiLeft < mfiLow) {
        mfiLow = mfiLeft;
      }
    }

    return mfiLow;
  }

  getMfi(high, low, close, volume, period) {
    return tulind.indicators.mfi.indicator([high, low, close, volume], [period]);
  }
}

export default new MfiService();

import * as _ from 'lodash';
import * as tulind from 'tulind';

class BBandBreakoutService {
  async isBreakout(quotes, previousMfi: number, currentMfi: number, currentBBand, bbandPeriod) {
    if (previousMfi < 16 && currentMfi > previousMfi){
        const previousBband = await this.getBBands(quotes.slice(1, -1), bbandPeriod, 2);
        console.log('previousBband', previousBband);
        console.log('currentBBand', currentBBand);
        console.log('currentMfi', currentMfi);
        console.log('previousMfi', previousMfi);

    }
    return false;
  }

  getBBands(real, period, stddev) {
    return tulind.indicators.bbands.indicator([real], [period, stddev]);
  }
}

export default new BBandBreakoutService();

import * as _ from 'lodash';
import { DaytradeRecommendation } from './backtest.service';

class AlgoService {
  getLowerBBand(bband): number {
    return bband[0][0];
  }

  getUpperBBand(bband): number {
    return bband[2][0];
  }

  checkVwma(lastClose: number, vwma: number): DaytradeRecommendation {
    if (lastClose > vwma) {
      return DaytradeRecommendation.Bearish;
    } else {
      return DaytradeRecommendation.Neutral;
    }
  }

  checkMfi(mfi: number): DaytradeRecommendation {
    if (mfi < 14) {
      return DaytradeRecommendation.Bullish;
    } else if (mfi > 80) {
      return DaytradeRecommendation.Bearish;
    }
    return DaytradeRecommendation.Neutral;
  }

  checkRocMomentum(mfi: number,
    roc10: number, roc10Previous: number,
    roc70: number, roc70Previous: number): DaytradeRecommendation {
    if (roc10Previous >= 0 && roc10 < 0) {
      if (mfi > 42) {
        return DaytradeRecommendation.Bearish;
      }
    }

    if (roc70Previous <= 0 && roc70 > 0) {
      if (mfi < 75) {
        return DaytradeRecommendation.Bullish;
      }
    }

    return DaytradeRecommendation.Neutral;
  }

  checkBBand(price: number, low: number, high: number, mfi: number): DaytradeRecommendation {
    if (price <= low && mfi < 20) {
      return DaytradeRecommendation.Bullish;
    }

    if (price >= high && mfi > 80) {
      return DaytradeRecommendation.Bearish;
    }

    return DaytradeRecommendation.Neutral;
  }

  countRecommendation(recommendation: DaytradeRecommendation,
    counter: any) {
    switch (recommendation) {
      case DaytradeRecommendation.Bullish:
        counter.bullishCounter++;
        break;
      case DaytradeRecommendation.Bearish:
        counter.bearishCounter++;
        break;
      default:
        counter.neutralCounter++;
    }
    return counter;
  }


}

export default new AlgoService();

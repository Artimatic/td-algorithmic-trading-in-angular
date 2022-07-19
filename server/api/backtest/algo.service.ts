import * as _ from 'lodash';
import { DaytradeRecommendation, Indicators } from './backtest.service';
import DecisionService from '../mean-reversion/reversion-decision.service';

class AlgoService {
  getLowerBBand(bband): number {
    return bband[0][0];
  }

  getUpperBBand(bband): number {
    return bband[2][0];
  }

  checkVwma(lastClose: number, vwma: number): DaytradeRecommendation {
    if (lastClose > vwma) {
      return DaytradeRecommendation.Bullish;
    } else {
      return DaytradeRecommendation.Bearish;
    }
  }

  checkMfi(mfi: number): DaytradeRecommendation {
    if (mfi < 20) {
      return DaytradeRecommendation.Bullish;
    } else if (mfi > 80) {
      return DaytradeRecommendation.Bearish;
    }
    return DaytradeRecommendation.Neutral;
  }

  checkRocMomentum(mfiPrevious: number, mfi: number,
    roc10: number, roc10Previous: number,
    roc70: number, roc70Previous: number): DaytradeRecommendation {
    if (roc10Previous >= 0 && roc10 < 0) {
      if (mfiPrevious > mfi) {
        return DaytradeRecommendation.Bearish;
      }
    }

    if (roc70Previous <= 0 && roc70 > 0) {
      if (mfi < 65 && mfiPrevious < mfi) {
        return DaytradeRecommendation.Bullish;
      }
    }

    return DaytradeRecommendation.Neutral;
  }

  checkBBand(price: number, low: number, high: number, mfi: number): DaytradeRecommendation {
    if (price <= low && mfi < 40) {
      return DaytradeRecommendation.Bullish;
    }

    if (price >= high && mfi > 60) {
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

  checkRocCrossover(roc70Previous: number, roc70: number, mfi: number): DaytradeRecommendation {
    if (roc70Previous > 0 && roc70 < 0 && mfi > 78) {
      return DaytradeRecommendation.Bearish;
    }
    if (roc70Previous < 0 && roc70 > 0 && mfi < 23) {
      return DaytradeRecommendation.Bullish;
    }

    return DaytradeRecommendation.Neutral;
  }

  checkMfiTrend(mfiPrevious: number, mfi: number, roc10Previous: number, roc10: number): DaytradeRecommendation {
    const change = DecisionService.getPercentChange(mfi, mfiPrevious);
    const changeRoc = Math.abs(DecisionService.getPercentChange(roc10, roc10Previous));
    if (change > 0.2 && roc10 > roc10Previous && changeRoc > 0.1) {
      return DaytradeRecommendation.Bullish;
    } else if (change < -0.2 && roc10Previous > roc10 && changeRoc > 0.1) {
      return DaytradeRecommendation.Bearish;
    }

    return DaytradeRecommendation.Neutral;
  }

  checkMfiDivergence(mfiPrevious: number, mfi: number, roc10Previous: number, roc10: number): DaytradeRecommendation {
    const mfiChange = Math.abs(DecisionService.getPercentChange(mfi, mfiPrevious));
    const roc10Change = Math.abs(DecisionService.getPercentChange(roc10, roc10Previous));
    if (mfiChange > 0.18 && roc10Change > 0.1) {
      if (mfiPrevious < mfi && roc10Previous > roc10) {
        return DaytradeRecommendation.Bullish;
      } else if (mfiPrevious > mfi && roc10Previous < roc10) {
        return DaytradeRecommendation.Bearish;
      }
    }
    return DaytradeRecommendation.Neutral;
  }

  checkMacd(indicator: Indicators, previousIndicator: Indicators): DaytradeRecommendation {
    if (previousIndicator) {
      const macd = indicator.macd[2];
      const prevMacd = previousIndicator.macd[2];

      if (macd[macd.length - 1] > 0 && prevMacd[prevMacd.length - 1] <= 0) {
        return DaytradeRecommendation.Bullish;
      } else if (macd[macd.length - 1] <= 0 && prevMacd[prevMacd.length - 1] > 0) {
        return DaytradeRecommendation.Bearish;
      }
    }
    return DaytradeRecommendation.Neutral;
  }

  checkMacdDaytrade(currentMacd: any, previousMacd: any): DaytradeRecommendation {
    if (previousMacd) {
      const macd = currentMacd[2];
      const prevMacd = previousMacd[2];

      if (macd[macd.length - 1] > 0 && prevMacd[prevMacd.length - 1] <= 0) {
        return DaytradeRecommendation.Bullish;
      } else if (macd[macd.length - 1] <= 0 && prevMacd[prevMacd.length - 1] > 0) {
        return DaytradeRecommendation.Bearish;
      }
    }
    return DaytradeRecommendation.Neutral;
  }

  checkDemark9(demark9Indicator): DaytradeRecommendation {
    if (demark9Indicator.perfectSell) {
      return DaytradeRecommendation.Bearish;
    } else if (demark9Indicator.perfectBuy) {
      return DaytradeRecommendation.Bullish;
    }
    return DaytradeRecommendation.Neutral;
  }

  checkMfiLow(mfiLow: number, mfi: number): DaytradeRecommendation {
    const change = DecisionService.getPercentChange(mfi, mfiLow);

    if (change < 0.03 && change > -0.03) {
      return DaytradeRecommendation.Bullish;
    }

    return DaytradeRecommendation.Neutral;
  }

}

export default new AlgoService();

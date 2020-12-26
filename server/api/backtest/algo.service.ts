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
      return DaytradeRecommendation.Bearish;
    } else {
      return DaytradeRecommendation.Neutral;
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

  checkRocCrossover(roc70Previous: number, roc70: number): DaytradeRecommendation {
    if (roc70Previous > 0 && roc70 < 0) {
      return DaytradeRecommendation.Bearish;
    }
    if (roc70Previous < 0 && roc70 > 0) {
      return DaytradeRecommendation.Bullish;
    }

    return DaytradeRecommendation.Neutral;
  }

  checkMfiTrend(mfiPrevious: number, mfi: number): DaytradeRecommendation {
    const change = DecisionService.getPercentChange(mfi, mfiPrevious);
    if (change > 0.3) {
      return DaytradeRecommendation.Bearish;
    } else if (change < -0.3) {
      return DaytradeRecommendation.Bullish;
    }

    return DaytradeRecommendation.Neutral;
  }

  checkMfiDivergence(mfiPrevious: number, mfi: number, roc10Previous: number, roc10: number): DaytradeRecommendation {
    const mfiChange = Math.abs(DecisionService.getPercentChange(mfi, mfiPrevious));
    const roc10Change = Math.abs(DecisionService.getPercentChange(roc10, roc10Previous));
    if (mfiChange > 0.1 && roc10Change > 0.3 && mfiPrevious < mfi && roc10Previous > roc10) {
      return DaytradeRecommendation.Bullish;
    } else if (mfiChange > 0.1 && roc10Change > 0.3 && mfiPrevious > mfi && roc10Previous < roc10) {
      return DaytradeRecommendation.Bearish;
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

  checkMacdDaytrade(indicator: Indicators, roc10Previous: number, roc10: number): DaytradeRecommendation {
    const macd = indicator.macd[2];

    if (roc10Previous > 0 && roc10 < 0) {
      if (macd[macd.length - 1] <= 0) {
        return DaytradeRecommendation.Bearish;
      }
    }

    if (roc10Previous < 0 && roc10 > 0) {
      if (macd[macd.length - 1] > 0) {
        return DaytradeRecommendation.Bullish;
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

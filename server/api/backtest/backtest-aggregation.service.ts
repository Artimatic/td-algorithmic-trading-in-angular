import * as _ from 'lodash';
import { Indicators } from './backtest.constants';
import DecisionService from '../mean-reversion/reversion-decision.service';

class BacktestAggregationService {
  getSignalResults(signals: Indicators[]) {
    const indicatorsTable = {};

    const shortTermMinIdx = signals.length - 26;
    const midTermMinIdx = signals.length - 90;

    signals.forEach((current, idx) => {
      for (const indicator in current.recommendation) {
        if (current.recommendation.hasOwnProperty(indicator)) {
          const indicatorName = String(indicator);
          const recommendation = current.recommendation[indicatorName];
          if (recommendation.toLowerCase() === 'bullish') {
            const indicatorResults = this.getIndicatorResults(indicatorsTable, indicatorName);

            if (idx > shortTermMinIdx && idx < signals.length - 12) {
              const futureClose = signals[idx + 10].close;
              const percentChange = DecisionService.getPercentChange(futureClose, current.close);
              indicatorResults.bullishShortTermProfitLoss += percentChange;
              indicatorResults.bullishShortTermSignals++;
              if (percentChange > 0) {
                indicatorResults.bullishShortTermProfitable++;
              }
            }

            if (idx > midTermMinIdx && idx < signals.length - 17) {
              const futureClose = signals[idx + 15].close;
              const percentChange = DecisionService.getPercentChange(futureClose, current.close);
              indicatorResults.bullishMidTermProfitLoss += percentChange;
              indicatorResults.bullishMidTermSignals++;
              if (percentChange > 0) {
                indicatorResults.bullishMidTermProfitable++;
              }
            }

            if (idx < signals.length - 25) {
              const futureClose = signals[idx + 20].close;
              const percentChange = DecisionService.getPercentChange(futureClose, current.close);
              indicatorResults.bullishProfitLoss += percentChange;
              indicatorResults.bullishSignals++;
              if (percentChange > 0) {
                indicatorResults.bullishProfitable++;
              }
            }
            indicatorsTable[indicatorName] = indicatorResults;
          } else if (recommendation.toLowerCase() === 'bearish') {
            const indicatorResults = this.getIndicatorResults(indicatorsTable, indicatorName);

            if (idx > shortTermMinIdx && idx < signals.length - 12) {
              const futureClose = signals[idx + 10].close;
              const percentChange = DecisionService.getPercentChange(current.close, futureClose);
              indicatorResults.bearishShortTermProfitLoss += percentChange;
              indicatorResults.bearishShortTermSignals++;
              if (percentChange < 0) {
                indicatorResults.bearishShortTermProfitable++;
              }
            }

            if (idx > midTermMinIdx && idx < signals.length - 17) {
              const futureClose = signals[idx + 15].close;
              const percentChange = DecisionService.getPercentChange(current.close, futureClose);
              indicatorResults.bearishMidTermProfitLoss += percentChange;
              indicatorResults.bearishMidTermSignals++;
              if (percentChange < 0) {
                indicatorResults.bearishMidTermProfitable++;
              }
            }
            if (idx < signals.length - 25) {
              const futureClose = signals[idx + 20].close;
              const percentChange = DecisionService.getPercentChange(current.close, futureClose);
              indicatorResults.bearishProfitLoss += percentChange;
              indicatorResults.bearishSignals++;
              if (percentChange < 0) {
                indicatorResults.bearishProfitable++;
              }
            }
            indicatorsTable[indicatorName] = indicatorResults;
          }
        }
      }
    });

    return indicatorsTable;
  }

  getIndicatorResults(indicatorsTable, indicatorName) {
    if (!indicatorsTable[indicatorName]) {
      const bearishResults = {
        bearishShortTermProfitLoss: 0,
        bearishShortTermSignals: 0,
        bearishShortTermProfitable: 0,
        bearishMidTermProfitLoss: 0,
        bearishMidTermSignals: 0,
        bearishMidTermProfitable: 0,
        bearishProfitLoss: 0,
        bearishSignals: 0,
        bearishProfitable: 0
      };

      const bullishResults = {
        bullishShortTermProfitLoss: 0,
        bullishShortTermSignals: 0,
        bullishShortTermProfitable: 0,
        bullishMidTermProfitLoss: 0,
        bullishMidTermSignals: 0,
        bullishMidTermProfitable: 0,
        bullishProfitLoss: 0,
        bullishSignals: 0,
        bullishProfitable: 0
      };

      indicatorsTable[indicatorName] = { ...bearishResults, ...bullishResults };
    }
    return indicatorsTable[indicatorName];
  }

  getChadScore(activeSignals: string[], indicatorsScore, bullish: boolean) {
    const scoreHash = {};
    activeSignals.forEach((value) => {
      scoreHash[value] = {};
      scoreHash[value].bull = indicatorsScore[value].bullishMidTermProfitLoss;
      scoreHash[value].bear = indicatorsScore[value].bearishMidTermProfitLoss;
    });
  }

  getProbabilityOfProfit(bullishActiveIndicators, bearishActiveIndicators, signals) {
    const indicatorsTable = this.getSignalResults(signals);
    let bullishProbability = null;
    let bearishProbability = null;

    bullishActiveIndicators.forEach(indicator => {
      if (indicatorsTable[indicator]) {
        const prob = _.round(indicatorsTable[indicator].bullishProfitable  / indicatorsTable[indicator].bullishSignals, 2);
        if (!bullishProbability) {
          bullishProbability = 1;
        }
        bullishProbability *= prob;
      }
    });

    bearishActiveIndicators.forEach(indicator => {
      if (indicatorsTable[indicator]) {
        const prob = _.round(indicatorsTable[indicator].bearishProfitable / indicatorsTable[indicator].bearishSignals, 2);
        if (!bearishProbability) {
          bearishProbability = 1;
        }
        bearishProbability *= prob;
      }
    });

    return {
      bullishProbability: _.round(bullishProbability, 2),
      bearishProbability: _.round(bearishProbability, 2)
    };
  }
}

export default new BacktestAggregationService();

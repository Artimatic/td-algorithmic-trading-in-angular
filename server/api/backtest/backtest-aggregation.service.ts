import * as _ from 'lodash';
import { Indicators } from './backtest.service';
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
            }

            if (idx > midTermMinIdx && idx < signals.length - 17) {
              const futureClose = signals[idx + 15].close;
              const percentChange = DecisionService.getPercentChange(futureClose, current.close);
              indicatorResults.bullishMidTermProfitLoss += percentChange;
              indicatorResults.bullishMidTermSignals++;
            }

            if (idx < signals.length - 25) {
              const futureClose = signals[idx + 20].close;
              const percentChange = DecisionService.getPercentChange(futureClose, current.close);
              indicatorResults.bullishProfitLoss += percentChange;
              indicatorResults.bullishSignals++;
            }
            indicatorsTable[indicatorName] = indicatorResults;
          } else if (recommendation.toLowerCase() === 'bearish') {
            const indicatorResults = this.getIndicatorResults(indicatorsTable, indicatorName);

            if (idx > shortTermMinIdx && idx < signals.length - 12) {
              const futureClose = signals[idx + 10].close;
              const percentChange = DecisionService.getPercentChange(current.close, futureClose);
              indicatorResults.bearishShortTermProfitLoss += percentChange;
              indicatorResults.bearishShortTermSignals++;
            }

            if (idx > midTermMinIdx && idx < signals.length - 17) {
              const futureClose = signals[idx + 15].close;
              const percentChange = DecisionService.getPercentChange(current.close, futureClose);
              indicatorResults.bearishMidTermProfitLoss += percentChange;
              indicatorResults.bearishMidTermSignals++;
            }
            if (idx < signals.length - 25) {
              const futureClose = signals[idx + 20].close;
              const percentChange = DecisionService.getPercentChange(current.close, futureClose);
              indicatorResults.bearishProfitLoss += percentChange;
              indicatorResults.bearishSignals++;
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
        bearishMidTermProfitLoss: 0,
        bearishMidTermSignals: 0,
        bearishProfitLoss: 0,
        bearishSignals: 0
      };

      const bullishResults = {
        bullishShortTermProfitLoss: 0,
        bullishShortTermSignals: 0,
        bullishMidTermProfitLoss: 0,
        bullishMidTermSignals: 0,
        bullishProfitLoss: 0,
        bullishSignals: 0
      };

      indicatorsTable[indicatorName] = { ...bearishResults, ...bullishResults };
    }
    return indicatorsTable[indicatorName];
  }
}

export default new BacktestAggregationService();

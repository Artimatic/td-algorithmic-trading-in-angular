import { Injectable } from '@angular/core';
import { DailyBacktestService } from '@shared/daily-backtest.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class ScoreSignalFactoryService {

  constructor(private dailyBacktestService: DailyBacktestService) { }

  getSignalScores(stock, signals) {
    this.dailyBacktestService.getSignalScores(signals)
      .subscribe((score) => {
        const update = {
          macdBearishShortTerm: 0,
          macdBearishMidTerm: 0,
          macdBearish: 0,
          macdBullishShortTerm: 0,
          macdBullishMidTerm: 0,
          macdBullish: 0,
          rocBearishShortTerm: 0,
          rocBearishMidTerm: 0,
          rocBearish: 0,
          rocBullishShortTerm: 0,
          rocBullishMidTerm: 0,
          rocBullish: 0,
          mfiBearishShortTerm: 0,
          mfiBearishMidTerm: 0,
          mfiBearish: 0,
          mfiBullishShortTerm: 0,
          mfiBullishMidTerm: 0,
          mfiBullish: 0,
          mfiTradeBearishShortTerm: 0,
          mfiTradeBearishMidTerm: 0,
          mfiTradeBearish: 0,
          mfiTradeBullishShortTerm: 0,
          mfiTradeBullishMidTerm: 0,
          mfiTradeBullish: 0,
          bbandBearishShortTerm: 0,
          bbandBearishMidTerm: 0,
          bbandBearish: 0,
          bbandBullishShortTerm: 0,
          bbandBullishMidTerm: 0,
          bbandBullish: 0,
          demark9BearishShortTerm: 0,
          demark9BearishMidTerm: 0,
          demark9Bearish: 0,
          demark9BullishShortTerm: 0,
          demark9BullishMidTerm: 0,
          demark9Bullish: 0
        };

        if (score.macd) {
          update.macdBearishShortTerm = this.roundNumber(score.macd.bearishShortTermProfitLoss);
          update.macdBearishMidTerm = this.roundNumber(score.macd.bearishMidTermProfitLoss);
          update.macdBearish = this.roundNumber(score.macd.bearishProfitLoss);
          update.macdBullishShortTerm = this.roundNumber(score.macd.bullishShortTermProfitLoss);
          update.macdBullishMidTerm = this.roundNumber(score.macd.bullishMidTermProfitLoss);
          update.macdBullish = this.roundNumber(score.macd.bullishProfitLoss);
        }

        if (score.roc) {
          update.rocBearishShortTerm = this.roundNumber(score.roc.bearishShortTermProfitLoss);
          update.rocBearishMidTerm = this.roundNumber(score.roc.bearishMidTermProfitLoss);
          update.rocBearish = this.roundNumber(score.roc.bearishProfitLoss);
          update.rocBullishShortTerm = this.roundNumber(score.roc.bullishShortTermProfitLoss);
          update.rocBullishMidTerm = this.roundNumber(score.roc.bullishMidTermProfitLoss);
          update.rocBullish = this.roundNumber(score.roc.bullishProfitLoss);
        }

        if (score.mfiTrade) {
          update.mfiTradeBearishShortTerm = this.roundNumber(score.mfiTrade.bearishShortTermProfitLoss);
          update.mfiTradeBearishMidTerm = this.roundNumber(score.mfiTrade.bearishMidTermProfitLoss);
          update.mfiTradeBearish = this.roundNumber(score.mfiTrade.bearishProfitLoss);
          update.mfiTradeBullishShortTerm = this.roundNumber(score.mfiTrade.bullishShortTermProfitLoss);
          update.mfiTradeBullishMidTerm = this.roundNumber(score.mfiTrade.bullishMidTermProfitLoss);
          update.mfiTradeBullish = this.roundNumber(score.mfiTrade.bullishProfitLoss);
        }


        if (score.mfi) {
          update.mfiBearishShortTerm = this.roundNumber(score.mfi.bearishShortTermProfitLoss);
          update.mfiBearishMidTerm = this.roundNumber(score.mfi.bearishMidTermProfitLoss);
          update.mfiBearish = this.roundNumber(score.mfi.bearishProfitLoss);
          update.mfiBullishShortTerm = this.roundNumber(score.mfi.bullishShortTermProfitLoss);
          update.mfiBullishMidTerm = this.roundNumber(score.mfi.bullishMidTermProfitLoss);
          update.mfiBullish = this.roundNumber(score.mfi.bullishProfitLoss);
        }

        if (score.bband) {
          update.bbandBearishShortTerm = this.roundNumber(score.bband.bearishShortTermProfitLoss);
          update.bbandBearishMidTerm = this.roundNumber(score.bband.bearishMidTermProfitLoss);
          update.bbandBearish = this.roundNumber(score.bband.bearishProfitLoss);
          update.bbandBullishShortTerm = this.roundNumber(score.bband.bullishShortTermProfitLoss);
          update.bbandBullishMidTerm = this.roundNumber(score.bband.bullishMidTermProfitLoss);
          update.bbandBullish = this.roundNumber(score.bband.bullishProfitLoss);
        }

        if (score.demark9) {
          update.demark9BearishShortTerm = this.roundNumber(score.demark9.bearishShortTermProfitLoss);
          update.demark9BearishMidTerm = this.roundNumber(score.demark9.bearishMidTermProfitLoss);
          update.demark9Bearish = this.roundNumber(score.demark9.bearishProfitLoss);
          update.demark9BullishShortTerm = this.roundNumber(score.demark9.bullishShortTermProfitLoss);
          update.demark9BullishMidTerm = this.roundNumber(score.demark9.bullishMidTermProfitLoss);
          update.demark9Bullish = this.roundNumber(score.demark9.bullishProfitLoss);
        }
      });
  }

  roundNumber(num) {
    return _.round(num, 2);
  }

  getProbabilityOfProfit() {
  }
}

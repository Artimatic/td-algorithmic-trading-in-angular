
import round from 'lodash/round';
import PortfolioService from '../portfolio/portfolio.service';
import portfolioController from '../portfolio/portfolio.controller';
import DecisionService from '../mean-reversion/reversion-decision.service';

export interface MonthlyStrategyList {
    month: string;
    year: number;
    day: number;
    daysToExp: number;
    secondaryMonth: string;
    secondaryYear: number;
    secondaryDay: number;
    secondaryDaysToExp: number;
    type: string;
    secondaryType: string;
    leap: boolean;
    optionStrategyList: Strategy[];
}

export interface Strategy {
    primaryLeg: Option;
    secondaryLeg: Option;
    strategyStrike: number;
    strategyBid: number;
    strategyAsk: number;
}

export interface Option {
    symbol: string;
    putCallInd: string;
    description: string;
    bid: number;
    ask: number;
    range: string;
    strikePrice: number;
    totalVolume: number;
}

export interface OptionsChain {
    symbol: string;
    underlying: {
      symbol: string;
      description: string;
      change: number;
      percentChange: number;
      close: number;
      bid: number;
      ask: number;
      last: number;
      mark: number;
      markChange: number;
      markPercentChange: number;
      bidSize: number;
      askSize: number;
      highPrice: number;
      lowPrice: number;
      openPrice: number;
      totalVolume: number;
      fiftyTwoWeekHigh: number;
      fiftyTwoWeekLow: number;
    };
    monthlyStrategyList: MonthlyStrategyList[];
}

export interface ImpliedMove {
    move: number;
    upperPrice: number;
    lowerPrice: number;
    strategy: Strategy;
}

class OptionService {
    calculateImpliedMove(accountId, symbol, strikeCount, optionType): ImpliedMove {
        return PortfolioService.getOptionsStraddle(accountId, symbol, strikeCount, optionType)
            .then((straddleOptionsChain: OptionsChain) => {
                const strategyList = straddleOptionsChain.monthlyStrategyList[0];
                const goal = straddleOptionsChain.underlying.last;
                console.log('goal: ', goal);

                const closestStrikeStraddle = strategyList.optionStrategyList.reduce((prev, curr) =>  {
                    console.log('examinging: ', curr.strategyStrike);
                    return (Math.abs(curr.strategyStrike - goal) < Math.abs(prev.strategyStrike - goal) ? curr : prev);
                  });

                const strategyCost = portfolioController.midPrice(closestStrikeStraddle.strategyAsk, closestStrikeStraddle.strategyBid);
                const move = round(DecisionService.calculatePercentDifference(strategyCost, goal));

                return {
                    move,
                    upperPrice: null,
                    lowerPrice: null,
                    strategy: closestStrikeStraddle
                };
            });
    }
}

export default new OptionService();


import * as _ from 'lodash';
import PortfolioService from '../portfolio/portfolio.service';
import portfolioController from '../portfolio/portfolio.controller';

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
    calculateImpliedMove(accountId, symbol, strikeCount, optionType) {
        return PortfolioService.getOptionsStraddle(accountId, symbol, strikeCount, optionType)
            .then((straddleOptionsChain: OptionsChain) => {
                const strategyList = straddleOptionsChain.monthlyStrategyList.find(element => element.daysToExp > 10);
                const goal = straddleOptionsChain.underlying.last;

                const closestStrikeStraddle = strategyList.optionStrategyList.reduce((prev, curr) =>  {
                    return (Math.abs(curr.strategyStrike - goal) < Math.abs(prev.strategyStrike - goal) ? curr : prev);
                  });

                const strategyCost = portfolioController.midPrice(closestStrikeStraddle.strategyAsk, closestStrikeStraddle.strategyBid);
                const move = _.round(strategyCost / goal, 3);
                const movePrice = _.round(move * goal, 2);

                return {
                    move,
                    upperPrice: _.round(goal + movePrice, 2),
                    lowerPrice: _.round(goal - movePrice, 2),
                    strategyCost,
                    strategy: closestStrikeStraddle
                };
            });
    }
}

export default new OptionService();

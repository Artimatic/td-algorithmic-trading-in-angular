
import * as _ from 'lodash';
import axios from 'axios';

import PortfolioService from '../portfolio/portfolio.service';
import portfolioController from '../portfolio/portfolio.controller';

import * as configurations from '../../config/environment';

const dataServiceUrl = configurations.apps.goliath;

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
  status: string;
  strategy: string;
  interval: number;
  isDelayed: boolean;
  isIndex: boolean;
  interestRate: number;
  underlyingPrice: number;
  volatility: number;
  daysToExpiration: number;
  numberOfContracts: number;
  assetMainType: string;
  assetSubType: string;
  isChainTruncated: boolean;
  intervals: number[];
  monthlyStrategyList: MonthlyStrategyList[];
}

export interface ImpliedMove {
  move: number;
  upperPrice: number;
  lowerPrice: number;
  strategy: Strategy;
}

class OptionService {
  calculateImpliedMove(accountId, symbol, strikeCount, optionType, minExpiration = 29, response) {
    return PortfolioService.getOptionsStrangle(accountId, symbol, strikeCount, optionType, response)
      .then((strangleOptionsChain: OptionsChain) => {
        const strategyList = strangleOptionsChain.monthlyStrategyList.find(element => element.daysToExp >= minExpiration);
        const goal = strangleOptionsChain.underlyingPrice;

        const closestStrikeStrangle = strategyList.optionStrategyList.reduce((prev, curr) => {
          return (Math.abs(curr.strategyStrike - goal) < Math.abs(prev.strategyStrike - goal) ? curr : prev);
        });

        const strategyCost = portfolioController.midPrice(closestStrikeStrangle.strategyAsk, closestStrikeStrangle.strategyBid);
        const move = _.round(strategyCost / goal, 3);
        const movePrice = _.round(move * goal, 2);

        this.saveImpliedMove(symbol, move);
        return {
          move,
          upperPrice: _.round(goal + movePrice, 2),
          lowerPrice: _.round(goal - movePrice, 2),
          strategyCost,
          strategy: closestStrikeStrangle,
          optionsChain: strangleOptionsChain
        };
      });
  }

  private saveImpliedMove(symbol: string, move: number) {
    if (move) {
      axios.post(`${dataServiceUrl}backtest/update-implied-move`, {
        symbol,
        impliedMove: move
      });
    }
  }
}

export default new OptionService();

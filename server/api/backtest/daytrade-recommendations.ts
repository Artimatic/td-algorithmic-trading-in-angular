import * as moment from 'moment';
import QuoteService from '../quote/quote.service';
import PortfolioService from '../portfolio/portfolio.service';
import { DaytradeRecommendation } from './backtest.constants';
import AlgoService from './algo.service';
class DaytradeRecommendations {
    getBbandRecommendation(indicator) {
        return AlgoService.checkBBand(indicator.close,
            AlgoService.getLowerBBand(indicator.bband80), AlgoService.getUpperBBand(indicator.bband80));
    }
    createMfiDivRecommendation(currentIndicator, currentIndex: number, indicatorsList) {
        if (!currentIndicator.recommendation) {
            currentIndicator.recommendation = {};
        }
        if (indicatorsList[currentIndex - 4].mfiLeft < 15 &&
            this.getBbandRecommendation(indicatorsList[currentIndex - 4]) === DaytradeRecommendation.Bullish &&
            indicatorsList[currentIndex - 3].mfiLeft > indicatorsList[currentIndex - 4].mfiLeft &&
            this.getBbandRecommendation(indicatorsList[currentIndex - 3]) === DaytradeRecommendation.Bullish &&
            indicatorsList[currentIndex - 2].mfiLeft > indicatorsList[currentIndex - 3].mfiLeft &&
            this.getBbandRecommendation(indicatorsList[currentIndex - 2]) === DaytradeRecommendation.Bullish &&
            this.getBbandRecommendation(indicatorsList[currentIndex - 1]) === DaytradeRecommendation.Neutral) {
            currentIndicator.recommendation.mfiDivergence = DaytradeRecommendation.Bullish;
        } else if (indicatorsList[currentIndex - 4].mfiLeft > 80 &&
            this.getBbandRecommendation(indicatorsList[currentIndex - 4]) === DaytradeRecommendation.Bearish &&
            indicatorsList[currentIndex - 3].mfiLeft < indicatorsList[currentIndex - 4].mfiLeft &&
            this.getBbandRecommendation(indicatorsList[currentIndex - 3]) === DaytradeRecommendation.Bearish &&
            indicatorsList[currentIndex - 2].mfiLeft < indicatorsList[currentIndex - 3].mfiLeft &&
            this.getBbandRecommendation(indicatorsList[currentIndex - 2]) === DaytradeRecommendation.Bearish &&
            this.getBbandRecommendation(indicatorsList[currentIndex - 1]) === DaytradeRecommendation.Neutral) {
            currentIndicator.recommendation.mfiDivergence = DaytradeRecommendation.Bearish;
        } else {
            currentIndicator.recommendation.mfiDivergence = DaytradeRecommendation.Neutral;
        }
        return currentIndicator;
    }

    getIntradayQuotes(symbol, dataSource = 'td') {
        switch (dataSource) {
            case 'tiingo': {
                return QuoteService.getTiingoIntraday(symbol, moment().subtract({ day: 1 }).format('YYYY-MM-DD'));
            }
            default: {
                return PortfolioService.getIntradayV2(symbol, 1, null, null, null);
            }
        }
    }

    initStrategy(q) {
    }

    getIndicatorsForAll(symbol, dataSource = 'td') {
        const getIndicatorQuotes = [];

        return this.getIntradayQuotes(symbol, dataSource)
            .then(intradayObj => {
                const quotes = (intradayObj as any).candles;
                let idx = 0;
                while (idx < quotes.length) {
                    const minLength = idx - 14;
                    const q = quotes.slice(minLength, idx);
                    if (q.length > 0) {
                        getIndicatorQuotes.push(this.initStrategy(q));
                    }
                    idx++;
                }
            })
    }

    getDaytradeRecommendations() {
    }
}

export default new DaytradeRecommendations();
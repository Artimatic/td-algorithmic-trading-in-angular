const moment = require('moment');
const algebra = require('algebra.js');
const math = require('mathjs');
const Fraction = algebra.Fraction;
const Expression = algebra.Expression;
const Equation = algebra.Equation;

class DecisionService {
  trends;

  constructor() {
    this.trends = {
      down: 'Sell',
      up: 'Buy',
      indet: 'Indeterminant'
    };
  }
  getTrendsConst() {
    return this.trends;
  }
  getTrendLogic(lastPrice, thirtyDay, ninetyDay, trend) {
    if (lastPrice < ninetyDay && lastPrice < thirtyDay) {
      trend = this.trends.up;
    } else if (lastPrice > ninetyDay && lastPrice > thirtyDay) {
      trend = this.trends.down;
    } else if (thirtyDay > ninetyDay && trend === this.trends.up) {
      trend = this.trends.down;
    } else if (thirtyDay < ninetyDay && trend === this.trends.up) {
      trend = this.trends.up;
    } else if (thirtyDay < ninetyDay && trend === this.trends.down) {
      trend = this.trends.up;
    } else if (thirtyDay > ninetyDay && trend === this.trends.down) {
      trend = this.trends.down;
    }

    return trend;
  }

  getInitialTrend(quotes, end, deviation) {
    let trend = this.trends.indet;

    if ((quotes[end].close > quotes[end - 1].close) &&
      (quotes[end - 1].close > quotes[end - 2].close) &&
      (quotes[end - 2].close > quotes[end - 3].close)) {
      trend = this.trends.up;
    } else if ((quotes[end].close < quotes[end - 1].close) &&
      (quotes[end - 1].close < quotes[end - 2].close) &&
      (quotes[end - 1].close < quotes[end - 2].close)) {
      trend = this.trends.down;
    }
    return trend;
  }

  triggerCondition(lastPrice, shortTermAvg, longTermAvg, deviation) {
    if (this.calculatePercentDifference(shortTermAvg, longTermAvg) <= deviation) {
      return true;
    }
    return false;
  }

  solveExpression(thirtyAvgTotal, ninetyAvgTotal, acceptedDeviation) {
    const thirtyFraction = math.fraction(math.number(math.round(thirtyAvgTotal, 3))),
      ninetyFraction = math.fraction(math.number(math.round(ninetyAvgTotal, 3))),
      leftConstant = math.multiply(thirtyFraction, math.fraction('1/30')),
      rightConstant = math.multiply(ninetyFraction, math.fraction('1/90')),
      leftConstantFraction = new Fraction(leftConstant.n, leftConstant.d),
      rightConstantFraction = new Fraction(rightConstant.n, rightConstant.d),
      leftCoefficient = new Fraction(1, 30),
      rightCoefficient = new Fraction(1, 90);

    let leftSide = new Expression('x');
    leftSide = leftSide.multiply(leftCoefficient);
    leftSide = leftSide.add(leftConstantFraction);

    let rightSide = new Expression('x');
    rightSide = rightSide.multiply(rightCoefficient);
    rightSide = rightSide.add(rightConstantFraction);

    let eq = null;

    eq = new Equation(leftSide, rightSide);

    const x = eq.solveFor('x');
    const perfectPrice = this.fractionToPrice(x.toString());

    acceptedDeviation = math.number(math.round(acceptedDeviation, 3));

    const lowerbound = this.findLowerbound(leftSide.toString(), rightSide.toString(), 0, perfectPrice, acceptedDeviation);

    const lowerThirtyAvg = math.divide(math.add(thirtyAvgTotal, lowerbound), 30);
    const upperThirtyAvg = math.divide(math.add(thirtyAvgTotal, perfectPrice), 30);
    const lowerNinetyAvg = math.divide(math.add(thirtyAvgTotal, lowerbound), 30);
    const upperNinetyAvg = math.divide(math.add(thirtyAvgTotal, perfectPrice), 30);
    return {
      upper: { price: perfectPrice, thirtyDay: upperThirtyAvg, ninetyDay: upperNinetyAvg },
      lower: { price: lowerbound, thirtyDay: lowerThirtyAvg, ninetyDay: lowerNinetyAvg }
    };
  }

  findLowerbound(fn1, fn2, lower, upper, acceptedDifference) {
    let mid,
      avg1,
      avg2,
      result = -1;

    while (lower <= upper) {
      mid = math.round((upper + lower) / 2, 2);
      avg1 = math.eval(fn1, { x: mid });
      avg2 = math.eval(fn2, { x: mid });
      if (math.compare(this.calculatePercentDifference(avg1, avg2), acceptedDifference) > 0) {
        lower = mid + 0.01;
      } else {
        upper = mid - 0.01;
        result = mid;
      }
    }
    return result;
  }

  calculatePercentDifference(v1, v2) {
    return Math.abs(Math.abs(v1 - v2) / ((v1 + v2) / 2));
  }

  getPercentChange(currentPrice, boughtPrice) {
    if (boughtPrice === 0 || currentPrice === boughtPrice) {
      return 0;
    } else {
      return (currentPrice - boughtPrice) / boughtPrice;
    }
  }
  
  fractionToPrice(fraction) {
    return math.round(math.eval(fraction), 2);
  }

  calcReturns(decisions, deviation, startDate) {
    const results = decisions.reduce((orders, day) => {
      if (moment(day.date).isAfter(moment(startDate).subtract(1, 'day').format())) { 
        if (this.triggerCondition(day.close, day.shortTermAvg, day.longTermAvg, deviation)) {
          if (day.trending === this.trends.down) {
            orders.trades++;
            // Sell
            if (orders.buy.length > 0) {
              const holding = orders.buy.shift(),
                profit = day.close - holding;
              orders.total += holding;
              orders.net += profit;
            }
          } else if (day.trending === this.trends.up) {
            orders.trades++;
            // Buy
            orders.buy.push(day.close);
          }
        }
      }
      return orders;
    }, { buy: [], total: 0, net: 0, trades: 0 });

    const totalTrades = results.trades;
    let totalReturns = math.divide(results.net, results.total);

    if (isNaN(totalReturns)) {
      totalReturns = 0;
    }
    const response = { totalReturns, totalTrades };

    return response;
  }

  findDeviation(decisions, startDate) {
    let i = 0,
      maxReturn = math.round(this.calcReturns(decisions, 0, startDate).totalReturns, 3),
      max = 0;

    while (math.compare(i, 0.035) < 0) {
      i = math.round(math.add(i, 0.001), 3);
      let currentReturn = this.calcReturns(decisions, i, startDate).totalReturns;
      currentReturn = math.round(currentReturn, 3);
      if (math.compare(currentReturn, maxReturn) === 1) {
        maxReturn = currentReturn;
        max = i;
      }
    }

    return max;
  }
}

export default new DecisionService();

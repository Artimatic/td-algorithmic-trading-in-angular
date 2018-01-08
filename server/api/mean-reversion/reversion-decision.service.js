const moment = require('moment');
const algebra = require("algebra.js");
const math = require("mathjs");
const Fraction = algebra.Fraction;
const Expression = algebra.Expression;
const Equation = algebra.Equation;


const trends = {
  down: 'Sell',
  up: 'Buy',
  indet: 'Indeterminant'
};

function getTrendsConst() {
  return trends;
}

function getTrendLogic(lastPrice, thirtyDay, ninetyDay, trend) {
  if (lastPrice < ninetyDay && lastPrice < thirtyDay) {
    trend = trends.up;
  } else if (lastPrice > ninetyDay && lastPrice > thirtyDay) {
    trend = trends.down;
  } else if (thirtyDay > ninetyDay && trend === trends.up) {
    trend = trends.down;
  } else if (thirtyDay < ninetyDay && trend === trends.up) {
    trend = trends.up;
  } else if (thirtyDay < ninetyDay && trend === trends.down) {
    trend = trends.up;
  } else if (thirtyDay > ninetyDay && trend === trends.down) {
    trend = trends.down;
  }

  return trend;
}

function getInitialTrend(quotes, end, deviation) {
  let trend = trends.indet;

  if ((quotes[end].close > quotes[end - 1].close) &&
    (quotes[end - 1].close > quotes[end - 2].close) &&
    (quotes[end - 2].close > quotes[end - 3].close)) {
    trend = trends.up;
  } else if ((quotes[end].close < quotes[end - 1].close) &&
    (quotes[end - 1].close < quotes[end - 2].close) &&
    (quotes[end - 1].close < quotes[end - 2].close)) {
    trend = trends.down;
  }
  return trend;
}

function triggerCondition(lastPrice, shortTermAvg, longTermAvg, deviation) {
  if (calculatePercentDifference(shortTermAvg, longTermAvg) <= deviation) {
    return true;
  }
  return false;
}

function solveExpression(thirtyAvgTotal, ninetyAvgTotal, acceptedDeviation) {
  let thirtyFraction = math.fraction(math.number(math.round(thirtyAvgTotal, 3))),
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

  let x = eq.solveFor('x');
  let perfectPrice = fractionToPrice(x.toString());

  acceptedDeviation = math.number(math.round(acceptedDeviation, 3));

  let lowerbound = findLowerbound(leftSide.toString(), rightSide.toString(), 0, perfectPrice, acceptedDeviation);

  let lowerThirtyAvg = math.divide(math.add(thirtyAvgTotal, lowerbound), 30);
  let upperThirtyAvg = math.divide(math.add(thirtyAvgTotal, perfectPrice), 30);
  let lowerNinetyAvg = math.divide(math.add(thirtyAvgTotal, lowerbound), 30);
  let upperNinetyAvg = math.divide(math.add(thirtyAvgTotal, perfectPrice), 30);
  return {
    upper: { price: perfectPrice, thirtyDay: upperThirtyAvg, ninetyDay: upperNinetyAvg },
    lower: { price: lowerbound, thirtyDay: lowerThirtyAvg, ninetyDay: lowerNinetyAvg }
  };
}

function findLowerbound(fn1, fn2, lower, upper, acceptedDifference) {
  let mid,
    avg1,
    avg2,
    result = -1;

  while (lower <= upper) {
    mid = math.round((upper + lower) / 2, 2)
    avg1 = math.eval(fn1, { x: mid });
    avg2 = math.eval(fn2, { x: mid });
    if (math.compare(calculatePercentDifference(avg1, avg2), acceptedDifference) > 0) {
      lower = mid + 0.01;
    } else {
      upper = mid - 0.01;
      result = mid;
    }
  }
  return result;
}

function calculatePercentDifference(v1, v2) {
  return Math.abs(Math.abs(v1 - v2) / ((v1 + v2) / 2));
}

function fractionToPrice(fraction) {
  return math.round(math.eval(fraction), 2);
}

function calcReturns(decisions, deviation, startDate) {
  let results = decisions.reduce(function (orders, day) {
    if (moment(day.date).isAfter(moment(startDate).subtract(1, 'day').format())) {
      if (triggerCondition(day.close, day.shortTermAvg, day.longTermAvg, deviation)) {
        if (day.trending === trends.down) {
          orders.trades++;
          //Sell
          if (orders.buy.length > 0) {
            let holding = orders.buy.shift(),
              profit = day.close - holding;
            orders.total += holding;
            orders.net += profit;
          }
        } else if (day.trending === trends.up) {
          orders.trades++;
          //Buy
          orders.buy.push(day.close);
        }
      }
    }
    return orders;
  }, { buy: [], total: 0, net: 0, trades: 0 });

  let totalTrades = results.trades;
  let totalReturns = math.divide(results.net, results.total);

  if (isNaN(totalReturns)) {
    totalReturns = 0;
  }
  let response = { totalReturns, totalTrades };

  return response;
}

function findDeviation(decisions, startDate) {
  let i = 0,
    maxReturn = math.round(calcReturns(decisions, 0, startDate).totalReturns, 3),
    max = 0;

  while (math.compare(i, 0.035) < 0) {
    i = math.round(math.add(i, 0.001), 3);
    let currentReturn = calcReturns(decisions, i, startDate).totalReturns;
    currentReturn = math.round(currentReturn, 3);
    if (math.compare(currentReturn, maxReturn) === 1) {
      maxReturn = currentReturn;
      max = i;
    }
  }

  return max;
}

module.exports = {
  getTrendsConst,
  getTrendLogic,
  getInitialTrend,
  triggerCondition,
  solveExpression,
  findLowerbound,
  calculatePercentDifference,
  fractionToPrice,
  calcReturns,
  findDeviation
};

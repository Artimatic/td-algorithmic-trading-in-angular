# Robinhood Station

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Install
* Create file 'credentials.js' in '\server\config\environment\credentials.js'
* Get Yahoo developer credentials: https://developer.yahoo.com/apps/create/
* Get AlphaVantage credentials: https://www.alphavantage.co/support/
* Add Yahoo Finance app and AlphaVantage api credentials to credentials.js: 
```
module.exports = {
  yahoo: {
    key: 'SOMEYAHOOKEY',
    secret: 'SOMESECRET'
  },
  alpha: {
    key: "SOMEALPHAVANTAGEKEY"
  }
};
```

Run `npm install`

## Build

Run `npm run build `.

## Start Server

Run `npm run start`

## Go

http://localhost:9000/

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## User Guide

#### Order Import Excel Example
|symbol | quantity | price | side | OrderSize | Stop | Target | StopLoss | MeanReversion1 | SpyMomentum | YahooData | SellAtClose | TakeProfit|
|----- | :-------------: | :-------------: | :-------------: |:-------------: |:-------------: |:-------------: |:-------------: |:-------------: |:-------------: |:-------------:|:-------------: |-----:|
|TSLA | 2 | 319.88 | DayTrade | 1 | -0.007 | 0.005 | 1 | 1 | 1 | 0 | 1| 1|
|MSFT | 4 | 112.03 | DayTrade | 2 | -0.007 | 0.005 | 1 | 1 | 1 | 0 | 1| 1|

#### Research Backtest Screener

Requires quotes-in-spring to be set up on the same machine.

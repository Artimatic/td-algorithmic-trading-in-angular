# Robinhood Station

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Install
* Create file 'credentials.js' in '\server\config\environment\credentials.js'
* Get Access to TD Ameritrade. Both a trading account and Developer account are necessary 
*  for API access: https://developer.tdameritrade.com/apis
* Add TD Ameritrade credentials to credentials.js: 
```
export default {
    port: 9000,
    /*
    * This App is using TD Ameritrade's API for real time quotes. You will need to sign up for both a trading 
    * account and Developer account.
    * Follow this guide to retrieve a refresh_token: 
    * https://developer.tdameritrade.com/content/simple-auth-local-apps
    * New refresh_token will have to be generated every 90 days.
    * 
    * The advantage here is more reliable and robust real time quote data.
    */
    tdameritrade: {
        consumer_key: 'TD AMERITRADE API CONSUMER KEY', // Necessary for daytrading. Provides realtime quotes
        refresh_token: 'REFRESH_TOKEN',
        accountId: 'ACCOUNTI_D
    },
    goliathUrl: 'http://localhost:8100/', // Data service local address https://github.com/Artimatic/station-data-service
    armadilloUrl: 'http://localhost:3000/', // Machine Learning service local address https://github.com/Artimatic/robinhood-algorithmic-trading-in-angular
    twilio: { // For SMS functionality
      key: 'KEY',
      id: 'ID'
    }
};

```

Run `npm install`

## Build

Run `npm run build `.

## Start Server

Run `npm run start`

## Host

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

Requires station-data-service to be set up and running. https://github.com/Artimatic/station-data-service

#### Machine Learning functionalities

Requires station-analysis-service to be set up and running. https://github.com/Artimatic/station-analysis-service

## Demo
[https://chaddaily.herokuapp.com/trade-view](https://chad-daily.appspot.com/)

screen shots:
https://imgur.com/a/wNKn2fw

# Robinhood Station


## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Install
* Create file 'credentials.js' in '\server\config\environment\credentials.js'
* Get Yahoo developer credentials: https://developer.yahoo.com/apps/create/
* Get AlphaVantage credentials: https://www.alphavantage.co/support/
* Add Yahoo Finance app and AlphaVantage api credentials to credentials.js: 
module.exports = {
  yahoo: {
    key: 'SOMEYAHOOKEY',
    secret: 'SOMESECRET'
  },
  alpha: {
    key: "SOMEALPHAVANTAGEKEY"
  }
};


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

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

import { PortfolioController } from './portfolio.controller';

export let portfolio = (request, response) => {
  PortfolioController.getPortfolio(request, response);
}

export let positions = (request, response) => {
  PortfolioController.getPositions(request, response);
}

export let login = (request, response) => {
  PortfolioController.login(request, response);
}

export let logout = (request, response) => {
  PortfolioController.logout(request, response);
}

export let mfaLogin = (request, response) => {
  PortfolioController.mfaLogin(request, response);
}

export let getResources = (request, response) => {
  PortfolioController.getResources(request, response);
}

export let sell = (request, response) => {
  PortfolioController.sell(request, response);
}

export let buy = (request, response) => {
  PortfolioController.buy(request, response);
}

export let instruments = (request, response) => {
  PortfolioController.getInstruments(request, response);
}

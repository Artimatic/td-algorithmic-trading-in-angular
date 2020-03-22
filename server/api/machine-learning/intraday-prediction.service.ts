import PortfolioService from '../portfolio/portfolio.service';

class IntradayPredicationService {
  train(symbol, startDate, endDate) {
    return PortfolioService.getIntradayV3(symbol, startDate, endDate)
      .then((data) => {
        console.log(data);
        return data;
      });
  }
}

export default new IntradayPredicationService();

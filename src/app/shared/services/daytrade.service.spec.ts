import { TestBed, inject } from '@angular/core/testing';

import { DaytradeService } from './daytrade.service';
import { BacktestService } from './backtest.service';
import { AuthenticationService } from './authentication.service';
import { PortfolioService } from './portfolio.service';
import { SmartOrder } from '../models/smart-order';

describe('DaytradeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [DaytradeService, BacktestService, AuthenticationService, PortfolioService]
    });
  });

  it('should be created', inject([DaytradeService], (service: DaytradeService) => {
    expect(service).toBeTruthy();
  }));

  it('should calculate percent change', inject([DaytradeService], (service: DaytradeService) => {
    const percentChange = service.getPercentChange(10, 5);
    expect(percentChange).toEqual(1);
  }));

  it('should calculate correct average cost with 1 buy order', inject([DaytradeService], (service: DaytradeService) => {
    const testOrders: SmartOrder[] = [
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 60, price: 49.52,
        submitted: false, pending: false,
        side: 'Buy',
        useTakeProfit: true,
        useStopLoss: true
      }
    ];

    const estimate = service.estimateAverageBuyOrderPrice(testOrders);
    expect(estimate).toEqual(49.52);
  }));

  it('should calculate correct average cost with 1 buy order 1 sell', inject([DaytradeService], (service: DaytradeService) => {
    const testOrders: SmartOrder[] = [
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 60, price: 49.52,
        submitted: false, pending: false,
        side: 'Buy',
        useTakeProfit: true,
        useStopLoss: true
      },
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 60, price: 50.01,
        submitted: false, pending: false,
        side: 'Sell',
        useTakeProfit: true,
        useStopLoss: true
      }
    ];

    const estimate = service.estimateAverageBuyOrderPrice(testOrders);
    expect(estimate).toEqual(0);
  }));

  it('should calculate correct average cost with 1 buy order 2 sell', inject([DaytradeService], (service: DaytradeService) => {
    const testOrders: SmartOrder[] = [
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 110, price: 49.52,
        submitted: false, pending: false,
        side: 'Buy',
        useTakeProfit: true,
        useStopLoss: true
      },
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 50, price: 51.02,
        submitted: false, pending: false,
        side: 'Sell',
        useTakeProfit: true,
        useStopLoss: true
      },
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 160, price: 53.33,
        submitted: false, pending: false,
        side: 'Sell',
        useTakeProfit: true,
        useStopLoss: true
      }
    ];

    const estimate = service.estimateAverageBuyOrderPrice(testOrders);
    expect(estimate).toEqual(0);
  }));

  it('should calculate correct average cost with 2 buy order 1 partial sell', inject([DaytradeService], (service: DaytradeService) => {
    const testOrders: SmartOrder[] = [
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 110, price: 51.98,
        submitted: false, pending: false,
        side: 'Buy',
        useTakeProfit: true,
        useStopLoss: true
      },
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 51.90
          },
        quantity: 50, price: 51.90,
        submitted: false, pending: false,
        side: 'buy',
        useTakeProfit: true,
        useStopLoss: true
      },
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 50, price: 51.61,
        submitted: false, pending: false,
        side: 'Sell',
        useTakeProfit: true,
        useStopLoss: true
      }
    ];

    const estimate = service.estimateAverageBuyOrderPrice(testOrders);
    expect(estimate).toEqual(51.94);
  }));

  it('should calculate correct average cost with 2 buy order 1 partial sell', inject([DaytradeService], (service: DaytradeService) => {
    const testOrders: SmartOrder[] = [
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 800, price: 51.98,
        submitted: false, pending: false,
        side: 'Buy',
        useTakeProfit: true,
        useStopLoss: true
      },
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 51.90
          },
        quantity: 100, price: 51.90,
        submitted: false, pending: false,
        side: 'BUY',
        useTakeProfit: true,
        useStopLoss: true
      },
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 50, price: 51.61,
        submitted: false, pending: false,
        side: 'Sell',
        useTakeProfit: true,
        useStopLoss: true
      }
    ];

    const estimate = service.estimateAverageBuyOrderPrice(testOrders);
    expect(estimate).toEqual(51.97);
  }));

  it('should calculate correct profit loss', inject([DaytradeService], (service: DaytradeService) => {
    const testOrders: SmartOrder[] = [
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 20, price: 51.98,
        submitted: false, pending: false,
        side: 'Buy',
        useTakeProfit: true,
        useStopLoss: true
      },
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 51.90
          },
        quantity: 18, price: 51.90,
        submitted: false, pending: false,
        side: 'BUY',
        useTakeProfit: true,
        useStopLoss: true
      },
      {
        holding:
          {
            instrument: '',
            symbol: 'SPXL',
            name: 'Direxion Daily S&P 500  Bull 3x Shares',
            realtime_price: 49.52
          },
        quantity: 30, price: 51.61,
        submitted: false, pending: false,
        side: 'Sell',
        useTakeProfit: true,
        useStopLoss: true
      }
    ];

    const estimate = service.estimateSellProfitLoss(testOrders);
    expect(estimate).toEqual(-10.30);
  }));
});

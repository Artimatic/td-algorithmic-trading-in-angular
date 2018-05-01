import { TestBed, inject } from '@angular/core/testing';

import { BacktestService } from './backtest.service';

describe('Backtest.ServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BacktestService]
    });
  });

  it('should be created', inject([BacktestService], (service: BacktestService) => {
    expect(service).toBeTruthy();
  }));
});

import { TestBed } from '@angular/core/testing';

import { DailyBacktestService } from './daily-backtest.service';

describe('DailyBacktestService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DailyBacktestService = TestBed.get(DailyBacktestService);
    expect(service).toBeTruthy();
  });
});

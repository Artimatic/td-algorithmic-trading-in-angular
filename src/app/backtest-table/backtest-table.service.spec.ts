import { TestBed } from '@angular/core/testing';

import { BacktestTableService } from './backtest-table.service';

describe('BacktestTableService', () => {
  let service: BacktestTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BacktestTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed, inject } from '@angular/core/testing';

import { Backtest.ServiceService } from './backtest.service.service';

describe('Backtest.ServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Backtest.ServiceService]
    });
  });

  it('should be created', inject([Backtest.ServiceService], (service: Backtest.ServiceService) => {
    expect(service).toBeTruthy();
  }));
});

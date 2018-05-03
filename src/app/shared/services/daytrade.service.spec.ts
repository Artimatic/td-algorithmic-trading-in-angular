import { TestBed, inject } from '@angular/core/testing';

import { DaytradeService } from './daytrade.service';

describe('DaytradeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DaytradeService]
    });
  });

  it('should be created', inject([DaytradeService], (service: DaytradeService) => {
    expect(service).toBeTruthy();
  }));

  it('should calculate percent change', inject([DaytradeService], (service: DaytradeService) => {
    const percentChange = service.getPercentChange(10, 5);
    expect(percentChange).toEqual(1);
  }));
});

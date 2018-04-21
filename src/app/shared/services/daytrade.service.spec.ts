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
});

import { TestBed } from '@angular/core/testing';

import { FindDaytradeService } from './find-daytrade.service';

describe('FindDaytradeService', () => {
  let service: FindDaytradeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FindDaytradeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

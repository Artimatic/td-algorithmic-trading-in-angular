import { TestBed } from '@angular/core/testing';

import { DaytradeManagerService } from './daytrade-manager.service';

describe('DaytradeManagerService', () => {
  let service: DaytradeManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DaytradeManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

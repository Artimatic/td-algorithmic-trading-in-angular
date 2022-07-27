import { TestBed } from '@angular/core/testing';

import { MachineDaytradingService } from './machine-daytrading.service';

describe('MachineDaytradingService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MachineDaytradingService = TestBed.get(MachineDaytradingService);
    expect(service).toBeTruthy();
  });
});

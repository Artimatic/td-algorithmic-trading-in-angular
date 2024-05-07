import { TestBed } from '@angular/core/testing';

import { CentralSchedulingService } from './central-scheduling.service';

describe('CentralSchedulingService', () => {
  let service: CentralSchedulingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CentralSchedulingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

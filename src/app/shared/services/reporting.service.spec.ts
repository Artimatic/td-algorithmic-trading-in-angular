import { TestBed, inject } from '@angular/core/testing';

import { ReportingService } from './reporting.service';

describe('ReportingService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReportingService]
    });
  });

  xit('createshould be created', inject([ReportingService], (service: ReportingService) => {
    expect(service).toBeTruthy();
  }));
});

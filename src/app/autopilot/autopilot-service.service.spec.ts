import { TestBed } from '@angular/core/testing';

import { AutopilotServiceService } from './autopilot-service.service';

describe('AutopilotServiceService', () => {
  let service: AutopilotServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutopilotServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { PapertradeLiveService } from './papertrade-live.service';

describe('PapertradeLiveService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PapertradeLiveService = TestBed.get(PapertradeLiveService);
    expect(service).toBeTruthy();
  });
});

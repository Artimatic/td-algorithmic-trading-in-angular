import { TestBed } from '@angular/core/testing';

import { AiPicksService } from './ai-picks.service';

describe('AiPicksService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AiPicksService = TestBed.get(AiPicksService);
    expect(service).toBeTruthy();
  });
});

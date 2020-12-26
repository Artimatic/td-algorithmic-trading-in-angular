import { TestBed } from '@angular/core/testing';

import { ScoreSignalFactoryService } from './score-signal-factory.service';

describe('ScoreSignalFactoryService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ScoreSignalFactoryService = TestBed.get(ScoreSignalFactoryService);
    expect(service).toBeTruthy();
  });
});

import { TestBed, inject } from '@angular/core/testing';

import { ScoreKeeperService } from './score-keeper.service';

describe('ScoreKeeperService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ScoreKeeperService]
    });
  });

  it('should be created', inject([ScoreKeeperService], (service: ScoreKeeperService) => {
    expect(service).toBeTruthy();
  }));
});

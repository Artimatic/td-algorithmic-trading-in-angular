import { TestBed, inject } from '@angular/core/testing';

import { AlgoService } from './algo.service';

describe('AlgoService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AlgoService]
    });
  });

  it('should be created', inject([AlgoService], (service: AlgoService) => {
    expect(service).toBeTruthy();
  }));
});

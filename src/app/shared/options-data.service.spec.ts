import { TestBed } from '@angular/core/testing';

import { OptionsDataService } from './options-data.service';

describe('OptionsDataService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: OptionsDataService = TestBed.get(OptionsDataService);
    expect(service).toBeTruthy();
  });
});

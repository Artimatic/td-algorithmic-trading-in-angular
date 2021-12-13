import { TestBed } from '@angular/core/testing';

import { WatchListService } from './watch-list.service';

describe('WatchListService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: WatchListService = TestBed.get(WatchListService);
    expect(service).toBeTruthy();
  });
});

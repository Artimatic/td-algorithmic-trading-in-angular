import { TestBed } from '@angular/core/testing';

import { GlobalTaskQueueService } from './global-task-queue.service';

describe('GlobalTaskQueueService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GlobalTaskQueueService = TestBed.get(GlobalTaskQueueService);
    expect(service).toBeTruthy();
  });
});

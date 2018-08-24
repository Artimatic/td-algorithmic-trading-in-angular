import { TestBed, inject } from '@angular/core/testing';

import { ExcelService } from './excel-service.service';

describe('ExcelServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExcelService]
    });
  });

  xit('createshould be created', inject([ExcelService], (service: ExcelService) => {
    expect(service).toBeTruthy();
  }));
});

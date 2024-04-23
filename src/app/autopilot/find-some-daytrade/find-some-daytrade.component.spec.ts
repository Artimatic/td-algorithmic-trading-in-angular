import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FindSomeDaytradeComponent } from './find-some-daytrade.component';

describe('FindSomeDaytradeComponent', () => {
  let component: FindSomeDaytradeComponent;
  let fixture: ComponentFixture<FindSomeDaytradeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FindSomeDaytradeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FindSomeDaytradeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

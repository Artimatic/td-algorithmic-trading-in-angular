import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MlTimeperiodsComponent } from './ml-timeperiods.component';

describe('MlTimeperiodsComponent', () => {
  let component: MlTimeperiodsComponent;
  let fixture: ComponentFixture<MlTimeperiodsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MlTimeperiodsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MlTimeperiodsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

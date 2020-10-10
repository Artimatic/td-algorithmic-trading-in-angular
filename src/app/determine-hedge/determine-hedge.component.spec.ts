import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetermineHedgeComponent } from './determine-hedge.component';

describe('DetermineHedgeComponent', () => {
  let component: DetermineHedgeComponent;
  let fixture: ComponentFixture<DetermineHedgeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetermineHedgeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetermineHedgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

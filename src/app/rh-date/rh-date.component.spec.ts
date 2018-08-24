import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RhDateComponent } from './rh-date.component';

describe('RhDateComponent', () => {
  let component: RhDateComponent;
  let fixture: ComponentFixture<RhDateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RhDateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RhDateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  xit('createshould create', () => {
    expect(component).toBeTruthy();
  });
});

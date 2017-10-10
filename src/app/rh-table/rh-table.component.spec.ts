import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RhTableComponent } from './rh-table.component';

describe('RhTableComponent', () => {
  let component: RhTableComponent;
  let fixture: ComponentFixture<RhTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RhTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RhTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

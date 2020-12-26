import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NeuroCardComponent } from './neuro-card.component';

describe('NeuroCardComponent', () => {
  let component: NeuroCardComponent;
  let fixture: ComponentFixture<NeuroCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NeuroCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NeuroCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

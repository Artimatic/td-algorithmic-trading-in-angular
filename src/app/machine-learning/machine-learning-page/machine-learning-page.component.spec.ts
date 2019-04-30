import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineLearningPageComponent } from './machine-learning-page.component';

describe('MachineLearningPageComponent', () => {
  let component: MachineLearningPageComponent;
  let fixture: ComponentFixture<MachineLearningPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MachineLearningPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineLearningPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SeesawCardComponent } from './seesaw-card.component';

describe('SeesawCardComponent', () => {
  let component: SeesawCardComponent;
  let fixture: ComponentFixture<SeesawCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SeesawCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SeesawCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

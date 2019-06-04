import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MlCardComponent } from './ml-card.component';

describe('MlCardComponent', () => {
  let component: MlCardComponent;
  let fixture: ComponentFixture<MlCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MlCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MlCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

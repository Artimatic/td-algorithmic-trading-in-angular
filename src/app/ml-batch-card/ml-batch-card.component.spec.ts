import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MlBatchCardComponent } from './ml-batch-card.component';

describe('MlBatchCardComponent', () => {
  let component: MlBatchCardComponent;
  let fixture: ComponentFixture<MlBatchCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MlBatchCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MlBatchCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

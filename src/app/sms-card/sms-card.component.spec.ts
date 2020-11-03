import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SmsCardComponent } from './sms-card.component';

describe('SmsCardComponent', () => {
  let component: SmsCardComponent;
  let fixture: ComponentFixture<SmsCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SmsCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SmsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

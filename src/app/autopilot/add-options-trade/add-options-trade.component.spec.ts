import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddOptionsTradeComponent } from './add-options-trade.component';

describe('AddOptionsTradeComponent', () => {
  let component: AddOptionsTradeComponent;
  let fixture: ComponentFixture<AddOptionsTradeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddOptionsTradeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddOptionsTradeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

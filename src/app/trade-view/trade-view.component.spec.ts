import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TradeViewComponent } from './trade-view.component';

describe('MainViewComponent', () => {
  let component: TradeViewComponent;
  let fixture: ComponentFixture<TradeViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TradeViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TradeViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  xit('createshould create', () => {
    expect(component).toBeTruthy();
  });
});

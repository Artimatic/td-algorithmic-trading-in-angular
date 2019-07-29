import { async, ComponentFixture, TestBed } from './node_modules/@angular/core/testing';

import { IntradayBacktestViewComponent } from './intraday-backtest-view.component';

describe('IntradayBacktestViewComponent', () => {
  let component: IntradayBacktestViewComponent;
  let fixture: ComponentFixture<IntradayBacktestViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IntradayBacktestViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IntradayBacktestViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

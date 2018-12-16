import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BacktestViewComponent } from './backtest-view.component';

describe('BacktestViewComponent', () => {
  let component: BacktestViewComponent;
  let fixture: ComponentFixture<BacktestViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BacktestViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BacktestViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BacktestTableComponent } from './backtest-table.component';

describe('BacktestTableComponent', () => {
  let component: BacktestTableComponent;
  let fixture: ComponentFixture<BacktestTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BacktestTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BacktestTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

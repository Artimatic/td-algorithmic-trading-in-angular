import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkBacktestComponent } from './bulk-backtest.component';

describe('BulkBacktestComponent', () => {
  let component: BulkBacktestComponent;
  let fixture: ComponentFixture<BulkBacktestComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BulkBacktestComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BulkBacktestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

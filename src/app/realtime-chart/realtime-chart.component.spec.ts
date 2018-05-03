import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RealtimeChartComponent } from './realtime-chart.component';

describe('RealtimeChartComponent', () => {
  let component: RealtimeChartComponent;
  let fixture: ComponentFixture<RealtimeChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RealtimeChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RealtimeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

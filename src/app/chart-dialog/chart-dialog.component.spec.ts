import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartDialogComponent } from './chart-dialog.component';

describe('ChartDialogComponent', () => {
  let component: ChartDialogComponent;
  let fixture: ComponentFixture<ChartDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChartDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChartDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

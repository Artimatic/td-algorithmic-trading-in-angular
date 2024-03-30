import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StrategyFinderComponent } from './strategy-finder.component';

describe('StrategyFinderComponent', () => {
  let component: StrategyFinderComponent;
  let fixture: ComponentFixture<StrategyFinderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StrategyFinderComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StrategyFinderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PortfolioTableComponent } from './portfolio-table.component';

describe('PortfolioTableComponent', () => {
  let component: PortfolioTableComponent;
  let fixture: ComponentFixture<PortfolioTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PortfolioTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PortfolioTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

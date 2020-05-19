import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PortfolioManagementComponent } from './portfolio-management.component';

describe('PortfolioManagementComponent', () => {
  let component: PortfolioManagementComponent;
  let fixture: ComponentFixture<PortfolioManagementComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PortfolioManagementComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PortfolioManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

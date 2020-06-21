import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FindBuyComponent } from './find-buy.component';

describe('FindBuyComponent', () => {
  let component: FindBuyComponent;
  let fixture: ComponentFixture<FindBuyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FindBuyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FindBuyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

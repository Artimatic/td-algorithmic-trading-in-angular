import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ResearchViewComponent } from './research-view.component';

describe('ResearchViewComponent', () => {
  let component: ResearchViewComponent;
  let fixture: ComponentFixture<ResearchViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ResearchViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ResearchViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

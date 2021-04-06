import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AiPicksComponent } from './ai-picks.component';

describe('AiPicksComponent', () => {
  let component: AiPicksComponent;
  let fixture: ComponentFixture<AiPicksComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AiPicksComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AiPicksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

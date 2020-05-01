import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniCardComponent } from './mini-card.component';

describe('MiniCardComponent', () => {
  let component: MiniCardComponent;
  let fixture: ComponentFixture<MiniCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MiniCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MiniCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TerminalViewComponent } from './terminal-view.component';

describe('TerminalViewComponent', () => {
  let component: TerminalViewComponent;
  let fixture: ComponentFixture<TerminalViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TerminalViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TerminalViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

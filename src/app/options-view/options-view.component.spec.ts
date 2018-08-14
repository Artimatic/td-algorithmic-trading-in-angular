import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OptionsViewComponent } from './options-view.component';

describe('OptionsViewComponent', () => {
  let component: OptionsViewComponent;
  let fixture: ComponentFixture<OptionsViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OptionsViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OptionsViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

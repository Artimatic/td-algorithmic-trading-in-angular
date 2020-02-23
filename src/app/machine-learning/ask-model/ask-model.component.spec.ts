import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AskModelComponent } from './ask-model.component';

describe('AskModelComponent', () => {
  let component: AskModelComponent;
  let fixture: ComponentFixture<AskModelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AskModelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AskModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

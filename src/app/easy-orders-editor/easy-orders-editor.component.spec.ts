import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EasyOrdersEditorComponent } from './easy-orders-editor.component';

describe('EasyOrdersEditorComponent', () => {
  let component: EasyOrdersEditorComponent;
  let fixture: ComponentFixture<EasyOrdersEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EasyOrdersEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EasyOrdersEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

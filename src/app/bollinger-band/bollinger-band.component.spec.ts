import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BollingerBandComponent } from './bollinger-band.component';

describe('BollingerBandComponent', () => {
  let component: BollingerBandComponent;
  let fixture: ComponentFixture<BollingerBandComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BollingerBandComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BollingerBandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

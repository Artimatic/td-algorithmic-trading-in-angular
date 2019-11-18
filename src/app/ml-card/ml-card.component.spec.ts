import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MlCardComponent } from './ml-card.component';
import { PortfolioService, DaytradeService, ReportingService } from '../shared';
import { Observable } from 'rxjs';
import { SmartOrder } from '../shared/models/smart-order';

const mockPortfolioService = {
  getQuote: (symbol) => Observable.of(3.33),
  extendedHoursBuy: (holding, quantity, price) => Observable.of({})
};

const mockReportingService = {
  addAuditLog:  () => {}
};

describe('MlCardComponent', () => {
  let component: MlCardComponent;
  let fixture: ComponentFixture<MlCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MlCardComponent],
      providers: [
        { provide: PortfolioService, useValue: mockPortfolioService },
        { provide: ReportingService, useValue: mockReportingService },
        DaytradeService
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MlCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('buy', () => {
    it('should send buy order', () => {
      spyOn(mockReportingService, 'addAuditLog');

      const testOrder: SmartOrder = {
        holding: {
          instrument: 'https://api.robinhood.com/instruments/18226051-6bfa-4c56-bd9a-d7575f0245c1/',
          symbol: 'VTI',
          name: 'Vanguard Total Stock Market ETF',
          realtime_price: 125.46
        },
        quantity: 10,
        price: 28.24,
        submitted: false,
        pending: false,
        side: 'DayTrade',
        useTakeProfit: true,
        useStopLoss: true,
        lossThreshold: -0.002,
        profitTarget: 0.004,
        spyMomentum: true,
        sellAtClose: true
      };
      component.firstFormGroup.value.amount = 800;
      component.buy(testOrder, 1);

      expect(mockReportingService.addAuditLog).toHaveBeenCalled();
    });
  });
});

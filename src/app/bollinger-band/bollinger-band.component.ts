import { Component, OnInit } from '@angular/core';
import { CartService } from '../shared/services/cart.service';
import { SmartOrder } from '../shared/models/smart-order';

@Component({
  selector: 'app-bollinger-band',
  templateUrl: './bollinger-band.component.html',
  styleUrls: ['./bollinger-band.component.css']
})
export class BollingerBandComponent implements OnInit {
  mu: SmartOrder;
  vti: SmartOrder;
  spxl: SmartOrder;
  vxx: SmartOrder;
  uvxy: SmartOrder;
  constructor(private cartService: CartService) { }

  ngOnInit() {
    this.spxl = {
      holding:
        {
          instrument: 'https://api.robinhood.com/instruments/496d6d63-a93d-4693-a5b5-d1e0a72d854f/',
          symbol: 'SPXL',
          name: 'Direxion Daily S&P 500  Bull 3x Shares',
          realtime_price: 49.52
        },
      quantity: 60, price: 49.52,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true
    };

    this.vti = {
      holding:
        {
          instrument: 'https://api.robinhood.com/instruments/18226051-6bfa-4c56-bd9a-d7575f0245c1/',
          symbol: 'VTI',
          name: 'Vanguard Total Stock Market ETF',
          realtime_price: 145.69
        },
      quantity: 60, price: 145.69,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true
    };

    this.vxx = {
      holding:
        {
          instrument: 'https://api.robinhood.com/instruments/55b9bfc4-c9e7-42ac-8478-73b0af48fad7/',
          symbol: 'VXX',
          name: 'iPath S&P 500 VIX Short-Term Futures ETN due 1/30/2019',
          realtime_price: 31.74
        },
      quantity: 60, price: 31.74,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true
    };

    this.uvxy = {
      holding:
        {
          instrument: 'https://api.robinhood.com/instruments/00e90099-4281-4c93-b50d-fbd4d2469821/',
          symbol: 'UVXY',
          name: 'ProShares Ultra VIX Short-Term Futures ETF',
          realtime_price: 9.65
        },
      quantity: 60, price: 9.65,
      submitted: false, pending: false,
      side: 'DayTrade',
      useTakeProfit: true,
      useStopLoss: true
    };

    this.mu = {
      holding:
        {
          instrument: 'https://api.robinhood.com/instruments/0a8a072c-e52c-4e41-a2ee-8adbd72217d3/',
          symbol: 'MU',
          name: 'Micron Technology, Inc. - Common Stock',
          realtime_price: 54.59000015258789
        },
      quantity: 60, price: 54.59000015258789,
      submitted: false, pending: false,
      side: 'Buy'
    };
  }

  deleteSellOrder(deleteOrder: SmartOrder) {
    this.cartService.deleteSell(deleteOrder);
  }

  deleteBuyOrder(deleteOrder: SmartOrder) {
    this.cartService.deleteBuy(deleteOrder);
  }
}

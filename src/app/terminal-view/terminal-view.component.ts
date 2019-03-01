import { Component, OnInit } from '@angular/core';
import { ReportingService, ScoreKeeperService } from '../shared';
import { CartService } from '../shared/services/cart.service';

@Component({
  selector: 'app-terminal-view',
  templateUrl: './terminal-view.component.html',
  styleUrls: ['./terminal-view.component.css']
})
export class TerminalViewComponent implements OnInit {

  constructor(public cartService: CartService,
    public reportingService: ReportingService,
    public scoreKeeperService: ScoreKeeperService) { }

  ngOnInit() {
  }

}

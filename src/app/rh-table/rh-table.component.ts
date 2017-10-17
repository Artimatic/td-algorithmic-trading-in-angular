import { Component, OnInit, Input } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { Stock, RhDataSource } from '../shared';

@Component({
  selector: 'app-rh-table',
  templateUrl: './rh-table.component.html',
  styleUrls: ['./rh-table.component.css']
})
export class RhTableComponent implements OnInit {
  @Input() data: Stock[];
  @Input() displayedColumns: string[];
  dataSource: RhDataSource | null;

  constructor() { }

  ngOnInit() {
    this.dataSource = new RhDataSource(this.data);
  }

}

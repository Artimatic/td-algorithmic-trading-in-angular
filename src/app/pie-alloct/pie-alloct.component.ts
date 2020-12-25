import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-pie-alloct',
  templateUrl: './pie-alloct.component.html',
  styleUrls: ['./pie-alloct.component.css']
})
export class PieAlloctComponent implements OnInit {
  data: any;

  constructor() { }

  ngOnInit() {
    this.data = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          data: [300, 50, 100],
          backgroundColor: [
            this.getRandomColor(),
            this.getRandomColor(),
            this.getRandomColor()
        ]
        }]
    };
  }

  getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
}

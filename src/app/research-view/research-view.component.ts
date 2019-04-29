import { Component, OnInit } from '@angular/core';
import { TodoService } from '../overview/todo-list/todo.service';

@Component({
  selector: 'app-research-view',
  templateUrl: './research-view.component.html',
  styleUrls: ['./research-view.component.css']
})
export class ResearchViewComponent implements OnInit {

  constructor(private todoService: TodoService) { }

  ngOnInit() {
    this.todoService.setScreenStocks();
  }

}

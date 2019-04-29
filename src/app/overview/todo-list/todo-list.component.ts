import { Component, OnInit } from '@angular/core';
import { TodoService } from './todo.service';

@Component({
  selector: 'app-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.css']
})
export class TodoListComponent implements OnInit {
  marketAnalysis: boolean;
  screenStocks: boolean;
  intradayBacktest: boolean;

  constructor(private todoService: TodoService) { }

  ngOnInit() {
    this.marketAnalysis = this.todoService.marketAnalysis;
    this.screenStocks = this.todoService.screenStocks;
    this.intradayBacktest = this.todoService.intradayBacktest;
  }

}

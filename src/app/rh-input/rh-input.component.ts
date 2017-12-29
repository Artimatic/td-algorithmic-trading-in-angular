import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-rh-input',
  templateUrl: './rh-input.component.html',
  styleUrls: ['./rh-input.component.css']
})
export class RhInputComponent implements OnInit {
  @Output() onQuery: EventEmitter<any> = new EventEmitter();
  form: FormGroup;

  constructor(fb: FormBuilder) {
    this.form = fb.group({
      query: new FormControl(''),
      deviation: null,
      short: 30,
      long: 90
    }, { updateOn: 'blur' });
  }

  ngOnInit() {
  }

  submit() {
    this.onQuery.emit(this.form.value);
  }
}

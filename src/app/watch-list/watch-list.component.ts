import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WatchListService } from './watch-list.service';

@Component({
  selector: 'app-watch-list',
  templateUrl: './watch-list.component.html',
  styleUrls: ['./watch-list.component.css']
})
export class WatchListComponent implements OnInit {
  display = false;
  selectedItem;
  defaultList = [];
  addFormGroup: FormGroup;
  phoneNumber = '';

  constructor(private _formBuilder: FormBuilder, private watchListService: WatchListService) { }

  ngOnInit() {
   this.defaultList = [];

    this.addFormGroup = this._formBuilder.group({
      stock: ['', Validators.required],
      phoneNumber: [this.phoneNumber, Validators.required]
    });
  }

  showDialog() {
    this.display = true;
  }
  
  onShow() {
    this.addFormGroup = this._formBuilder.group({
      stock: ['', [Validators.required, Validators.pattern('[A-Za-z]{1,5}')]],
      phoneNumber: [this.phoneNumber, [Validators.required, Validators.pattern('[0-9]{10}')]]
    });
    this.refreshList();
  }

  onHide() {
    this.display = false;
  }

  refreshList() {
    this.defaultList = this.watchListService.watchList.reduce((previous, current) => {
      previous.push({ label: current.stock, value: current });
      return previous;
    }, []);
  }

  addItem() {
    if (this.addFormGroup.valid) {
      this.phoneNumber = this.addFormGroup.value.phoneNumber;
      this.watchListService.addWatchItem(this.addFormGroup.value.stock.toUpperCase(), this.addFormGroup.value.phoneNumber);
      this.addFormGroup.value.stock = '';
      this.addFormGroup.setValue({stock: '', phoneNumber: this.phoneNumber});
      this.refreshList();
    }
  }

  removeItem() {
    if (this.selectedItem) {
      this.watchListService.removeWatchItem(this.selectedItem.stock, this.selectedItem.phoneNumber);
      this.refreshList();
    }
  }

  removeAll() {
    this.watchListService.removeAll();
    this.refreshList();
  }
}

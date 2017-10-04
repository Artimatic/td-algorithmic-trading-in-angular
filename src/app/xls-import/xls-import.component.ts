import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-xls-import',
  templateUrl: './xls-import.component.html',
  styleUrls: ['./xls-import.component.css']
})
export class XlsImportComponent implements OnInit {
  @ViewChild('fileInput') fileInput;
  @Output() onImport: EventEmitter<any> = new EventEmitter();
  constructor() { }

  ngOnInit() {
  }

  upload() {
    var reader = new FileReader();
    let fileBrowser = this.fileInput.nativeElement;
    const component = this;

    reader.onload = function (evt: any) {
      const data = evt.target.result;

      const workbook = XLSX.read(data, { type: 'binary' });

      const headerNames = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })[0];

      const parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      component.onImport.emit(parsedData);
    };

    reader.readAsBinaryString(fileBrowser.files[0]);
  }

  emitData(data) {

  }

}

import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-xls-import',
  templateUrl: './xls-import.component.html',
  styleUrls: ['./xls-import.component.css']
})
export class XlsImportComponent implements OnInit {
  @ViewChild('fileInput', {static: false}) fileInput;
  @Output() onImport: EventEmitter<any> = new EventEmitter();
  constructor() { }

  ngOnInit() {
  }

  upload() {
    const reader = new FileReader();
    const fileBrowser = this.fileInput.nativeElement;

    const overwriteOnload = function (evt: any) {
      const data = evt.target.result;

      const workbook = XLSX.read(data, { type: 'binary' });

      const parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      this.onImport.emit(parsedData);
    };

    reader.onload = overwriteOnload.bind(this);

    reader.readAsBinaryString(fileBrowser.files[0]);
  }
}

import { Component } from '@angular/core';
import { GlobalSettingsService } from '../global-settings.service';

@Component({
  selector: 'app-setting-controls',
  templateUrl: './setting-controls.component.html',
  styleUrls: ['./setting-controls.component.css']
})
export class SettingControlsComponent {
  ismeridian = true;

  constructor(public globalSettingsService: GlobalSettingsService) { }

  toggleMode(): void {
    this.ismeridian = !this.ismeridian;
  }
}

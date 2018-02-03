import { Pipe, PipeTransform } from '@angular/core';
import { PortfolioService } from '../services'

@Pipe({
  name: 'instrument',
  pure: false
})
export class InstrumentPipe implements PipeTransform {
  private cachedData: any = null;
  private cachedUrl = '';

  constructor(private portfolioService: PortfolioService) { }

  transform(url: any, args?: any): any {
    if (url !== this.cachedUrl) {
      this.cachedData = null;
      this.cachedUrl = url;
      this.portfolioService.getResource(url)
        .subscribe( result => this.cachedData = result.symbol );
    }

    return this.cachedData;
  }

}

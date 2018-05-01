import { InstrumentPipe } from './instrument.pipe';
import {PortfolioService } from '.././services/portfolio.service';
describe('InstrumentPipe', () => {

  it('create an instance', () => {
    const pipe = new InstrumentPipe();
    expect(pipe).toBeTruthy();
  });
});

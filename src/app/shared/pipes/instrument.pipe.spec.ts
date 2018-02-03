import { InstrumentPipe } from './instrument.pipe';

describe('InstrumentPipe', () => {
  it('create an instance', () => {
    const pipe = new InstrumentPipe();
    expect(pipe).toBeTruthy();
  });
});

import ZScore from '../technical-analysis/zscore.service';


describe('Zscore', () => {
  it('should get correct peak count', () => {
    let testData = [1,1,1.1,1,0.9,1,1,1.1,1,0.9,1,1.1,1,1,0.9,1,1,1.1,1,1,1,1,1.1,0.9,1,1.1,1,1,0.9,
      1,1.1,1,1,1.1,1,0.8,0.9,1,1.2,0.9,1,1,1.1,1.2,1,1.5,1,3,2,5,3,2,1,1,1,0.9,1,1,3,
      2.6,4,3,3.2,2,1,1,0.8,4,4,2,2.5,1,1,1];

    let lag = 30;
    let threshold = 5;
    let influence = 0;
    let results = ZScore.calc(testData, lag, threshold, influence);
    console.log('results: ', results);
    expect(results.peakCount).toEqual(5);
  });
});

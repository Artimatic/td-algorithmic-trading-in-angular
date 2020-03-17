
export class ZScoreOutput {
  input: number[];
  signals: number[];
  avgFilter: number[];
  filtered_stddev: number[];
  peakCount: number = 0;
}

class ZScore {

  public calc(input: number[], lag: number, threshold: number, influence: number): ZScoreOutput {

    let result: ZScoreOutput = new ZScoreOutput();
    let signals: number[] = Array(input.length).fill(0);
    let filteredY: number[] = input.slice(0);
    let avgFilter = Array(input.length).fill(0);
    let stdFilter = Array(input.length).fill(0);
    let inPeak: boolean = true;
    let lastPeakPos: number = 0;

    var initialWindow = filteredY.slice(0, lag);

    avgFilter[lag - 1] = this.avg(initialWindow);
    stdFilter[lag - 1] = this.stdDev(initialWindow);

    for (let i: number = lag; i < input.length; i++) {

      if (Math.abs(input[i] - avgFilter[i - 1]) > threshold * stdFilter[i - 1]) {

        signals[i] = (input[i] > avgFilter[i - 1]) ? 1 : -1;
        filteredY[i] = influence * input[i] + (1 - influence) * filteredY[i - 1];

        lastPeakPos = i;
        inPeak = true;

      } else {

        signals[i] = 0;
        filteredY[i] = input[i];

        if (inPeak) {
          result.peakCount++;
          inPeak = false;
        }

      }

      // Update rolling average and deviation
      var slidingWindow = filteredY.slice(i - lag + 1, i + 1);

      avgFilter[i] = this.avg(slidingWindow);
      stdFilter[i] = this.stdDev(slidingWindow);

    }

    // Copy to convenience class
    result.input = input;
    result.avgFilter = avgFilter;
    result.signals = signals;
    result.filtered_stddev = stdFilter;

    return result;

  }

  sum(values: number[]): number {
    return values.reduce((partial_sum, a) => partial_sum + a);
  }

  avg(values: number[]): number {

    let avg: number = 0;

    if (values && values.length) {
      let sum = this.sum(values);
      avg = sum / values.length;
    }

    return avg;

  }

  private stdDev(values: number[]): number {

    let stdDev: number = 0;

    if (values && values.length) {

      let avg: number = this.avg(values);

      let squareDiffs: number[] = values.map((value) => {
        let diff: number = value - avg;
        let sqrDiff: number = diff * diff;
        return sqrDiff;
      });

      let avgSquareDiff: number = this.avg(squareDiffs);

      stdDev = Math.sqrt(avgSquareDiff);

    }

    return stdDev;

  }

  public test(): boolean {

    let testData: number[] = [1, 1, 1.1, 1, 0.9, 1, 1, 1.1, 1, 0.9, 1, 1.1, 1, 1, 0.9, 1, 1, 1.1, 1, 1, 1, 1, 1.1, 0.9, 1, 1.1, 1, 1, 0.9,
      1, 1.1, 1, 1, 1.1, 1, 0.8, 0.9, 1, 1.2, 0.9, 1, 1, 1.1, 1.2, 1, 1.5, 1, 3, 2, 5, 3, 2, 1, 1, 1, 0.9, 1, 1, 3,
      2.6, 4, 3, 3.2, 2, 1, 1, 0.8, 4, 4, 2, 2.5, 1, 1, 1];

    //results from original implementation
    let knownResults: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1,
      1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1,
      1, 1, 1, 0, 0, 0]

    let lag: number = 30;
    let threshold: number = 5;
    let influence: number = 0;
    let test = this.calc(testData, lag, threshold, influence);
    console.log('test: ', test);
    let eq: boolean = true;

    if (test.signals.length == knownResults.length) {
      for (var i = test.signals.length; i--;) {
        if (knownResults[i] !== test.signals[i]) {
          eq = false;
        }
      }
    } else {
      eq = false;
    }

    return eq;

  }

}

export default new ZScore();

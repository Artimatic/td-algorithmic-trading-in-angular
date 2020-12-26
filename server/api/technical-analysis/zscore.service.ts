
export class ZScoreOutput {
  input: number[];
  signals: number[];
  avgFilter: number[];
  filtered_stddev: number[];
  peakCount = 0;
}

class ZScore {

  public calc(input: number[], lag: number, threshold: number, influence: number): ZScoreOutput {

    const result: ZScoreOutput = new ZScoreOutput();
    const signals: number[] = Array(input.length).fill(0);
    const filteredY: number[] = input.slice(0);
    const avgFilter = Array(input.length).fill(0);
    const stdFilter = Array(input.length).fill(0);
    let inPeak = true;

    const initialWindow = filteredY.slice(0, lag);

    avgFilter[lag - 1] = this.avg(initialWindow);
    stdFilter[lag - 1] = this.stdDev(initialWindow);

    for (let i: number = lag; i < input.length; i++) {

      if (Math.abs(input[i] - avgFilter[i - 1]) > threshold * stdFilter[i - 1]) {

        signals[i] = (input[i] > avgFilter[i - 1]) ? 1 : -1;
        filteredY[i] = influence * input[i] + (1 - influence) * filteredY[i - 1];

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
      const slidingWindow = filteredY.slice(i - lag + 1, i + 1);

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

    let avg = 0;

    if (values && values.length) {
      const sum = this.sum(values);
      avg = sum / values.length;
    }

    return avg;

  }

  private stdDev(values: number[]): number {

    let stdDev = 0;

    if (values && values.length) {

      const avg: number = this.avg(values);

      const squareDiffs: number[] = values.map((value) => {
        const diff: number = value - avg;
        const sqrDiff: number = diff * diff;
        return sqrDiff;
      });

      const avgSquareDiff: number = this.avg(squareDiffs);

      stdDev = Math.sqrt(avgSquareDiff);

    }

    return stdDev;

  }
}

export default new ZScore();

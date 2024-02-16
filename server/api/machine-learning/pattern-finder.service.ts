import crc32 from 'crc/calculators/crc32';
import * as moment from 'moment-timezone';

interface FeatureData {
    date: string;
    input: number[];
    output: number[];
}

class PatternFinderService {
    patternCache = {};
    lookBackWindowLength = 5;

    targetPatterns = {
        '8dae2c97': true,
        '9bc759a7': true,
        '34288355': true,
        '8332dc32': true,
        'e383d809': true
    };

    getHashValue(arr: number[]) {
        const value = new Uint8Array(arr);
        return crc32(value).toString(16);
    }

    findPatternsInFeatureSet(stock, data: FeatureData[]) {
        let counter = this.lookBackWindowLength;
        const foundPatterns = [];

        while (counter < data.length) {
            const currentPattern = this.getPattern(stock, data, counter);
            if (currentPattern && this.targetPatterns[currentPattern.key]) {
                foundPatterns.push(currentPattern);
            }
            counter++;
        }

        return foundPatterns;
    }

    getPattern(stock: string, data: FeatureData[], idx: number) {
        let counter = this.lookBackWindowLength;

        if (data.length < counter || idx <= counter) {
            return null;
        }
        const patternObj = {
            label: stock,
            value: [],
            original: []
        };
        while (counter >= 0) {
            patternObj.value = patternObj.value.concat(data[idx - counter].input);
            patternObj.original = [stock, data[idx - counter].date];
            counter--;
        }
        return {
            key: this.getHashValue(patternObj.value),
            data: patternObj
        };
    }
}


export const patternFinderService = new PatternFinderService();
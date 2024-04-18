export interface Options {
    ask: number,
    bid: number
    description: string;
    putCallInd: 'C'| 'P';
    range: 'ITM' | 'OTM';
    strikePrice: number;
    symbol: string;
    totalVolume: number;
}

export interface Strangle {
    call: Options;
    put: Options;
}
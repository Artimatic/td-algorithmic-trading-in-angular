import { Options } from './options';
import { Order } from './order';

export enum OrderTypes {
    equity,
    options
}

export interface SmartOrder extends Order {
    splits?: number;
    positionCount?: number;
    timeSubmitted?: string;
    signalTime?: number;
    lossThreshold?: number;
    profitTarget?: number;
    trailingStop?: number;
    useStopLoss?: boolean;
    useTrailingStopLoss?: boolean;
    useTakeProfit?: boolean;
    sellAtClose?: boolean;
    yahooData?: boolean;
    orderSize?: number;
    init?: boolean;
    stopped?: boolean;
    lastUpdated?: string;
    allocation?: number;
    type?: OrderTypes;
    primaryLeg?: Options;
    secondaryLeg?: Options;
    createdTime?: string;
}

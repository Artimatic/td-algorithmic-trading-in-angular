import { Order } from './order';

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
}

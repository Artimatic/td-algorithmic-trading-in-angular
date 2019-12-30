import { Order } from './order';

export interface SmartOrder extends Order {
    splits?: number;
    positionCount?: number;
    timeSubmitted?: number;
    signalTime?: number;
    lossThreshold?: number;
    profitTarget?: number;
    trailingStop?: number;
    useStopLoss?: boolean;
    useTrailingStopLoss?: boolean;
    useTakeProfit?: boolean;
    buyCloseSellOpen?: boolean;
    sellAtClose?: boolean;
    yahooData?: boolean;
    orderSize?: number;
    triggeredBacktest?: boolean;
    init?: boolean;
    stopped?: boolean;
}

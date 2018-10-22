import { Order } from './order';

export interface SmartOrder extends Order {
    splits?: number;
    filled?: number;
    timeSubmitted?: number;
    signalTime?: number;
    lossThreshold?: number;
    profitTarget?: number;
    useStopLoss?: boolean;
    useTakeProfit?: boolean;
    useMomentum1?: boolean;
    useMomentum2?: boolean;
    orderSize?: number;
    triggered?: boolean;
}

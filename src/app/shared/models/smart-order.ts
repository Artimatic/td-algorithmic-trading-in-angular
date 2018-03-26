import { Order } from './order';

export interface SmartOrder extends Order {
    splits?: number;
    filled?: number;
    timeSubmitted?: number;
    signalTime?: number;
    lossThreshold?: number;
    profitThreshold?: number;
}

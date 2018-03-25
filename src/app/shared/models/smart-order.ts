import { Order } from './order';

export interface SmartOrder extends Order {
    splits: number;
    filled: number;
    dateTimeSubmitted?: Date;
    lossThreshold?: number;
    profitThreshold?: number;
}

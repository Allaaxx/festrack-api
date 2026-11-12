import {
    StockMovement,
    CreateStockMovementParams,
} from '../entities/stock-movement.js';

export interface StockMovementRepository {
    create(params: CreateStockMovementParams, tx?: any): Promise<StockMovement>;
    findByStockId(stockId: string): Promise<StockMovement[]>;
}

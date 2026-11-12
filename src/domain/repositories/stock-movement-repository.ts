import {
    StockMovement,
    CreateStockMovementParams,
} from '../entities/stock-movement.js';

export interface StockMovementRepository {
    create(params: CreateStockMovementParams): Promise<StockMovement>;
    findByStockId(stockId: string): Promise<StockMovement[]>;
}

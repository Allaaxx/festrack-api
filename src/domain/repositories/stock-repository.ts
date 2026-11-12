import {
    Stock,
    CreateStockParams,
    UpdateStockParams,
} from '../entities/stock.js';

export interface StockRepository {
    create(params: CreateStockParams): Promise<Stock>;
    findByProductId(productId: string): Promise<Stock | null>;
    update(productId: string, params: UpdateStockParams): Promise<Stock>;
    delete(productId: string): Promise<Stock>;
}

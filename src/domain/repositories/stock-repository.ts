import {
    Stock,
    CreateStockParams,
    UpdateStockParams,
} from '../entities/stock.js';

export interface StockRepository {
    create(params: CreateStockParams, tx?: any): Promise<Stock>;
    findByProductId(productId: string, tx?: any): Promise<Stock | null>;
    update(
        productId: string,
        params: UpdateStockParams,
        tx?: any,
    ): Promise<Stock>;
    delete(productId: string, tx?: any): Promise<Stock>;
}

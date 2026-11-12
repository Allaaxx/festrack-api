import { eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import { stock } from '../../../db/postgres/schemas/index.js';
import {
    Stock,
    CreateStockParams,
    UpdateStockParams,
    StockRepository,
} from '../../../domain/index.js';

export type { StockRepository };

export class PostgresStockRepository implements StockRepository {
    constructor(private readonly database: Database = db) {}

    async create(params: CreateStockParams): Promise<Stock> {
        const [createdStock] = await this.database
            .insert(stock)
            .values({
                product_id: params.product_id,
                quantity: params.quantity ?? 0,
                reserved: params.reserved ?? 0,
            })
            .returning();

        return createdStock;
    }

    async findByProductId(productId: string): Promise<Stock | null> {
        const [item] = await this.database
            .select()
            .from(stock)
            .where(eq(stock.product_id, productId));

        return item ?? null;
    }

    async update(productId: string, params: UpdateStockParams): Promise<Stock> {
        const [updatedStock] = await this.database
            .update(stock)
            .set({
                ...params,
                updated_at: new Date(),
            })
            .where(eq(stock.product_id, productId))
            .returning();

        return updatedStock;
    }

    async delete(productId: string): Promise<Stock> {
        const [deletedStock] = await this.database
            .delete(stock)
            .where(eq(stock.product_id, productId))
            .returning();

        return deletedStock;
    }
}

import { eq, inArray, asc } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import { stock } from '../../../db/postgres/schemas/index.js';
import {
    Stock,
    CreateStockParams,
    UpdateStockParams,
    StockRepository,
} from '../../../domain/index.js';
import { txContext } from '../transaction-manager.js';

export type { StockRepository };

const mapStock = (s: typeof stock.$inferSelect): Stock => {
    const available = s.quantity - s.reserved;
    return {
        id: s.id,
        product_id: s.product_id,
        quantity: s.quantity,
        reserved: s.reserved,
        available_stock: available,
        availableStock: available,
        updated_at: s.updated_at,
    };
};

export class PostgresStockRepository implements StockRepository {
    constructor(private readonly database: Database = db) {}

    private getDb(tx?: any): Database {
        return (tx ?? txContext.getStore() ?? this.database) as Database;
    }

    async create(params: CreateStockParams, tx?: any): Promise<Stock> {
        const dbInstance = this.getDb(tx);
        const [createdStock] = await dbInstance
            .insert(stock)
            .values({
                product_id: params.product_id,
                quantity: params.quantity ?? 0,
                reserved: params.reserved ?? 0,
            })
            .returning();

        return mapStock(createdStock);
    }

    async findByProductId(productId: string, tx?: any): Promise<Stock | null> {
        const dbInstance = this.getDb(tx);
        const [item] = await dbInstance
            .select()
            .from(stock)
            .where(eq(stock.product_id, productId));

        return item ? mapStock(item) : null;
    }

    async findManyByProductIdsWithLock(
        productIds: string[],
        tx?: any,
    ): Promise<Stock[]> {
        if (!productIds || productIds.length === 0) {
            return [];
        }

        const sortedIds = [...new Set(productIds)].sort();
        const dbInstance = this.getDb(tx);

        const rows = await dbInstance
            .select()
            .from(stock)
            .where(inArray(stock.product_id, sortedIds))
            .orderBy(asc(stock.product_id))
            .for('update');

        return rows.map((r: typeof stock.$inferSelect) => mapStock(r));
    }

    async update(
        productId: string,
        params: UpdateStockParams,
        tx?: any,
    ): Promise<Stock> {
        const dbInstance = this.getDb(tx);
        const [updatedStock] = await dbInstance
            .update(stock)
            .set({
                ...params,
                updated_at: new Date(),
            })
            .where(eq(stock.product_id, productId))
            .returning();

        return updatedStock ? mapStock(updatedStock) : updatedStock;
    }

    async delete(productId: string, tx?: any): Promise<Stock> {
        const dbInstance = this.getDb(tx);
        const [deletedStock] = await dbInstance
            .delete(stock)
            .where(eq(stock.product_id, productId))
            .returning();

        return deletedStock ? mapStock(deletedStock) : deletedStock;
    }
}

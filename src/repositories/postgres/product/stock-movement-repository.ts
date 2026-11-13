import { eq, asc } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import {
    stockMovements,
    usersTable,
} from '../../../db/postgres/schemas/index.js';
import {
    StockMovement,
    StockMovementRepository,
    CreateStockMovementParams,
} from '../../../domain/index.js';
import { txContext } from '../transaction-manager.js';

export type { StockMovementRepository };

function mapStockMovement(
    row: typeof stockMovements.$inferSelect,
    author?: typeof usersTable.$inferSelect | null,
): StockMovement {
    const userDetails = author
        ? {
              id: author.id,
              name:
                  author.name ||
                  `${author.first_name} ${author.last_name}`.trim(),
              first_name: author.first_name,
              last_name: author.last_name,
              email: author.email,
          }
        : null;

    return {
        id: row.id,
        stockId: row.stockId,
        stock_id: row.stockId,
        type: row.type,
        quantity: row.quantity,
        notes: row.notes,
        referenceId: row.referenceId,
        reference_id: row.referenceId,
        createdByUserId: row.createdByUserId,
        created_by_user_id: row.createdByUserId,
        createdByUser: userDetails,
        createdBy: userDetails,
        user: userDetails,
        createdAt: row.createdAt,
        created_at: row.createdAt,
    };
}

export class PostgresStockMovementRepository implements StockMovementRepository {
    constructor(private readonly database: Database = db) {}

    async create(
        params: CreateStockMovementParams,
        tx?: any,
    ): Promise<StockMovement> {
        const dbInstance = (tx ??
            txContext.getStore() ??
            this.database) as Database;
        const [created] = await dbInstance
            .insert(stockMovements)
            .values({
                stockId: params.stockId,
                type: params.type,
                quantity: params.quantity,
                notes: params.notes ?? null,
                referenceId: params.referenceId ?? null,
                createdByUserId: params.createdByUserId ?? null,
            })
            .returning();

        return mapStockMovement(created, null);
    }

    async findByStockId(stockId: string): Promise<StockMovement[]> {
        const rows = await this.database
            .select({
                movement: stockMovements,
                author: usersTable,
            })
            .from(stockMovements)
            .leftJoin(
                usersTable,
                eq(stockMovements.createdByUserId, usersTable.id),
            )
            .where(eq(stockMovements.stockId, stockId))
            .orderBy(asc(stockMovements.createdAt), asc(stockMovements.id));

        return rows.map((r) => mapStockMovement(r.movement, r.author));
    }
}

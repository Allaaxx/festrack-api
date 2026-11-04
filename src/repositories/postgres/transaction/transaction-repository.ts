import { and, desc, eq, sql } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import {
    transactionsTable,
    TransactionTableSelect,
    usersTable,
    UserTableSelect,
} from '../../../db/postgres/schemas/index.js';
import { TransactionNotFoundError } from '../../../errors/transaction.js';
import {
    Transaction,
    TransactionFilters,
    CreateTransactionParams,
    UpdateTransactionParams,
    TransactionRepository,
    Balance,
} from '../../../domain/index.js';
import { toCents, fromCents } from '../helpers/currency.js';

export type { TransactionRepository, TransactionFilters };

function mapTransaction(
    row: TransactionTableSelect,
    author?: UserTableSelect | null,
): Transaction {
    const mapped: Transaction & {
        author?: {
            id: string;
            name: string;
            first_name: string;
            last_name: string;
            email: string;
            image: string | null;
        };
    } = {
        id: row.id,
        shop_id: row.shop_id,
        created_by_user_id: row.created_by_user_id,
        user_id: row.created_by_user_id,
        name: row.name,
        date: row.date,
        amount: fromCents(toCents(row.amount)),
        type: row.type,
        event_id: row.event_id,
    };

    if (author) {
        mapped.author = {
            id: author.id,
            name: author.name,
            first_name: author.first_name,
            last_name: author.last_name,
            email: author.email,
            image: author.image ?? null,
        };
    }

    return mapped;
}

export class PostgresTransactionRepository implements TransactionRepository {
    constructor(private readonly database: Database = db) {}

    async create(
        createTransactionParams: CreateTransactionParams,
    ): Promise<Transaction> {
        const [createdRow] = await this.database
            .insert(transactionsTable)
            .values({
                ...createTransactionParams,
                date: new Date(createTransactionParams.date),
                amount: createTransactionParams.amount.toString(),
            })
            .returning();

        return mapTransaction(createdRow);
    }

    async findById(transactionId: string): Promise<Transaction | null> {
        const [row] = await this.database
            .select()
            .from(transactionsTable)
            .where(eq(transactionsTable.id, transactionId));

        return row ? mapTransaction(row) : null;
    }

    async findByShopId(
        shopId: string,
        filters?: TransactionFilters,
    ): Promise<Transaction[]> {
        const conditions = [eq(transactionsTable.shop_id, shopId)];

        if (filters?.from) {
            const parsedFrom = new Date(filters.from);
            if (!isNaN(parsedFrom.getTime())) {
                const fromDate = parsedFrom.toISOString().slice(0, 10);
                conditions.push(
                    sql`${transactionsTable.date} >= ${fromDate}::date`,
                );
            }
        }

        if (filters?.to) {
            const parsedTo = new Date(filters.to);
            if (!isNaN(parsedTo.getTime())) {
                const toDate = parsedTo.toISOString().slice(0, 10);
                conditions.push(
                    sql`${transactionsTable.date} <= ${toDate}::date`,
                );
            }
        }

        if (filters?.event_id) {
            conditions.push(eq(transactionsTable.event_id, filters.event_id));
        }

        const rows = await this.database
            .select({
                transaction: transactionsTable,
                author: usersTable,
            })
            .from(transactionsTable)
            .leftJoin(
                usersTable,
                eq(transactionsTable.created_by_user_id, usersTable.id),
            )
            .where(and(...conditions))
            .orderBy(desc(transactionsTable.date));

        return rows.map((row) => mapTransaction(row.transaction, row.author));
    }

    async findByUserId(
        userId: string,
        filters?: TransactionFilters,
    ): Promise<Transaction[]> {
        const conditions = [eq(transactionsTable.created_by_user_id, userId)];

        if (filters?.from) {
            const parsedFrom = new Date(filters.from);
            if (!isNaN(parsedFrom.getTime())) {
                const fromDate = parsedFrom.toISOString().slice(0, 10);
                conditions.push(
                    sql`${transactionsTable.date} >= ${fromDate}::date`,
                );
            }
        }

        if (filters?.to) {
            const parsedTo = new Date(filters.to);
            if (!isNaN(parsedTo.getTime())) {
                const toDate = parsedTo.toISOString().slice(0, 10);
                conditions.push(
                    sql`${transactionsTable.date} <= ${toDate}::date`,
                );
            }
        }

        if (filters?.event_id) {
            conditions.push(eq(transactionsTable.event_id, filters.event_id));
        }

        const rows = await this.database
            .select({
                transaction: transactionsTable,
                author: usersTable,
            })
            .from(transactionsTable)
            .leftJoin(
                usersTable,
                eq(transactionsTable.created_by_user_id, usersTable.id),
            )
            .where(and(...conditions))
            .orderBy(desc(transactionsTable.date));

        return rows.map((row) => mapTransaction(row.transaction, row.author));
    }

    async getBalanceByShopId(
        shopId: string,
        filters?: TransactionFilters,
    ): Promise<Balance> {
        const conditions = [eq(transactionsTable.shop_id, shopId)];

        if (filters?.from) {
            const parsedFrom = new Date(filters.from);
            if (!isNaN(parsedFrom.getTime())) {
                const fromDate = parsedFrom.toISOString().slice(0, 10);
                conditions.push(
                    sql`${transactionsTable.date} >= ${fromDate}::date`,
                );
            }
        }

        if (filters?.to) {
            const parsedTo = new Date(filters.to);
            if (!isNaN(parsedTo.getTime())) {
                const toDate = parsedTo.toISOString().slice(0, 10);
                conditions.push(
                    sql`${transactionsTable.date} <= ${toDate}::date`,
                );
            }
        }

        if (filters?.event_id) {
            conditions.push(eq(transactionsTable.event_id, filters.event_id));
        }

        const [aggregation] = await this.database
            .select({
                totalEarnings: sql<string>`coalesce(sum(case when ${transactionsTable.type} = 'EARNING' then ${transactionsTable.amount} else 0 end), 0)::text`,
                totalExpenses: sql<string>`coalesce(sum(case when ${transactionsTable.type} = 'EXPENSE' then ${transactionsTable.amount} else 0 end), 0)::text`,
                totalInvestments: sql<string>`coalesce(sum(case when ${transactionsTable.type} = 'INVESTMENT' then ${transactionsTable.amount} else 0 end), 0)::text`,
            })
            .from(transactionsTable)
            .where(and(...conditions));

        const earningsCents = toCents(aggregation?.totalEarnings);
        const expensesCents = toCents(aggregation?.totalExpenses);
        const investmentsCents = toCents(aggregation?.totalInvestments);

        const totalCents = earningsCents + expensesCents + investmentsCents;
        const balanceCents = earningsCents - expensesCents - investmentsCents;

        const earningsPercentage =
            totalCents === 0n ? 0 : Number((earningsCents * 100n) / totalCents);

        const expensePercentage =
            totalCents === 0n ? 0 : Number((expensesCents * 100n) / totalCents);

        const investmentsPercentage =
            totalCents === 0n
                ? 0
                : Number((investmentsCents * 100n) / totalCents);

        return {
            earnings: fromCents(earningsCents),
            expenses: fromCents(expensesCents),
            investments: fromCents(investmentsCents),
            earningsPercentage,
            expensePercentage,
            investmentsPercentage,
            balance: fromCents(balanceCents),
        };
    }

    async update(
        transactionId: string,
        updateTransactionParams: UpdateTransactionParams,
    ): Promise<Transaction> {
        const [updatedRow] = await this.database
            .update(transactionsTable)
            .set({
                ...updateTransactionParams,
                date: updateTransactionParams.date
                    ? new Date(updateTransactionParams.date)
                    : undefined,
                amount:
                    updateTransactionParams.amount !== undefined
                        ? updateTransactionParams.amount.toString()
                        : undefined,
            })
            .where(eq(transactionsTable.id, transactionId))
            .returning();

        if (!updatedRow) {
            throw new TransactionNotFoundError(transactionId);
        }

        return mapTransaction(updatedRow);
    }

    async delete(transactionId: string): Promise<Transaction> {
        const [deletedRow] = await this.database
            .delete(transactionsTable)
            .where(eq(transactionsTable.id, transactionId))
            .returning();

        if (!deletedRow) {
            throw new TransactionNotFoundError(transactionId);
        }

        return mapTransaction(deletedRow);
    }
}

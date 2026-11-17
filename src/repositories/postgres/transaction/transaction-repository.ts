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

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

function formatInDefaultTimezone(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: DEFAULT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

function toCivilDateString(value: Date | string): string | null {
    if (value instanceof Date) {
        if (isNaN(value.getTime())) {
            return null;
        }
        if (
            value.getUTCHours() === 0 &&
            value.getUTCMinutes() === 0 &&
            value.getUTCSeconds() === 0 &&
            value.getUTCMilliseconds() === 0
        ) {
            return value.toISOString().slice(0, 10);
        }
        return formatInDefaultTimezone(value);
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const parsed = new Date(`${trimmed}T00:00:00.000Z`);
        if (
            isNaN(parsed.getTime()) ||
            parsed.toISOString().slice(0, 10) !== trimmed
        ) {
            return null;
        }
        return trimmed;
    }

    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}T.*[+-]\d{2}:?\d{2}$/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }

    if (/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z?$/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }

    return formatInDefaultTimezone(parsed);
}

function toCivilDate(value: Date | string): Date {
    const civilDate = toCivilDateString(value);
    if (!civilDate) {
        return new Date(value);
    }
    return new Date(`${civilDate}T00:00:00.000Z`);
}

function buildFilterConditions(
    baseCondition: ReturnType<typeof eq>,
    filters?: TransactionFilters,
) {
    const conditions = [baseCondition];

    if (filters?.from) {
        const fromDate = toCivilDateString(filters.from);
        if (fromDate) {
            conditions.push(
                sql`${transactionsTable.date} >= ${fromDate}::date`,
            );
        }
    }

    if (filters?.to) {
        const toDate = toCivilDateString(filters.to);
        if (toDate) {
            conditions.push(sql`${transactionsTable.date} <= ${toDate}::date`);
        }
    }

    if (filters?.event_id) {
        conditions.push(eq(transactionsTable.event_id, filters.event_id));
    }

    return conditions;
}

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
                date: toCivilDate(createTransactionParams.date),
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
        const conditions = buildFilterConditions(
            eq(transactionsTable.shop_id, shopId),
            filters,
        );

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
        const conditions = buildFilterConditions(
            eq(transactionsTable.created_by_user_id, userId),
            filters,
        );

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
        const conditions = buildFilterConditions(
            eq(transactionsTable.shop_id, shopId),
            filters,
        );

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
                    ? toCivilDate(updateTransactionParams.date)
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

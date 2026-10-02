import { and, eq, sql } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import {
    transactionsTable,
    TransactionTableSelect,
} from '../../../db/postgres/schemas/index.js';
import { TransactionNotFoundError } from '../../../errors/transaction.js';
import {
    Transaction,
    CreateTransactionParams,
    UpdateTransactionParams,
    TransactionRepository,
} from '../../../domain/index.js';

export type { TransactionRepository };

function toCents(val: string | number | null | undefined): bigint {
    if (!val) return 0n;
    const str = String(val).trim();
    if (str === '' || str === '0') return 0n;
    const isNeg = str.startsWith('-');
    const clean = isNeg ? str.slice(1) : str;
    const [intPart = '0', fracPart = ''] = clean.split('.');
    const paddedFrac = (fracPart + '00').slice(0, 2);
    const cents = BigInt(intPart || '0') * 100n + BigInt(paddedFrac);
    return isNeg ? -cents : cents;
}

function fromCents(cents: bigint): string {
    const isNeg = cents < 0n;
    const abs = isNeg ? -cents : cents;
    const intPart = (abs / 100n).toString();
    const fracPart = (abs % 100n).toString().padStart(2, '0');
    const trimmedFrac = fracPart.replace(/0+$/, '');
    const sign = isNeg ? '-' : '';
    return trimmedFrac
        ? `${sign}${intPart}.${trimmedFrac}`
        : `${sign}${intPart}`;
}

function mapTransaction(row: TransactionTableSelect): Transaction {
    return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        date: row.date,
        amount: fromCents(toCents(row.amount)),
        type: row.type,
        event_id: row.event_id,
    };
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

    async findByUserId(
        userId: string,
        from?: string,
        to?: string,
    ): Promise<Transaction[]> {
        const conditions = [eq(transactionsTable.user_id, userId)];

        if (from && to) {
            const fromDate = new Date(from).toISOString().slice(0, 10);
            const toDate = new Date(to).toISOString().slice(0, 10);
            conditions.push(
                sql`${transactionsTable.date} >= ${fromDate}::date`,
                sql`${transactionsTable.date} <= ${toDate}::date`,
            );
        }

        const rows = await this.database
            .select()
            .from(transactionsTable)
            .where(and(...conditions));

        return rows.map(mapTransaction);
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

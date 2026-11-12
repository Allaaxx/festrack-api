import { AsyncLocalStorage } from 'node:async_hooks';
import { db, Database } from '../../db/postgres/index.js';
import { TransactionManager } from '../../domain/repositories/transaction-manager.js';

export const txContext = new AsyncLocalStorage<any>();

export class DrizzleTransactionManager implements TransactionManager {
    constructor(private readonly database: Database = db) {}

    async run<T>(fn: () => Promise<T>): Promise<T> {
        const existingTx = txContext.getStore();
        if (existingTx) {
            return await fn();
        }

        return await this.database.transaction(async (tx) => {
            return await txContext.run(tx, async () => {
                return await fn();
            });
        });
    }
}

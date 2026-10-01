import {
    Transaction,
    CreateTransactionParams,
    UpdateTransactionParams,
} from '../entities/transaction.js';

export interface TransactionRepository {
    create(
        createTransactionParams: CreateTransactionParams,
    ): Promise<Transaction>;
    findById(transactionId: string): Promise<Transaction | null>;
    findByUserId(
        userId: string,
        from?: string,
        to?: string,
    ): Promise<Transaction[]>;
    update(
        transactionId: string,
        updateTransactionParams: UpdateTransactionParams,
    ): Promise<Transaction>;
    delete(transactionId: string): Promise<Transaction>;
}

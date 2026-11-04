import {
    Transaction,
    CreateTransactionParams,
    UpdateTransactionParams,
} from '../entities/transaction.js';
import { Balance } from '../entities/balance.js';

export interface TransactionFilters {
    from?: string;
    to?: string;
    event_id?: string;
}

export interface TransactionRepository {
    create(
        createTransactionParams: CreateTransactionParams,
    ): Promise<Transaction>;
    findById(transactionId: string): Promise<Transaction | null>;
    findByShopId(
        shopId: string,
        filters?: TransactionFilters,
    ): Promise<Transaction[]>;
    findByUserId(
        userId: string,
        filters?: TransactionFilters,
    ): Promise<Transaction[]>;
    getBalanceByShopId(
        shopId: string,
        filters?: TransactionFilters,
    ): Promise<Balance>;
    update(
        transactionId: string,
        updateTransactionParams: UpdateTransactionParams,
    ): Promise<Transaction>;
    delete(transactionId: string): Promise<Transaction>;
}

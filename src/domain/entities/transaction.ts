import { DecimalLike } from './balance.js';

export type TransactionType = 'EXPENSE' | 'EARNING' | 'INVESTMENT';

export interface Transaction {
    id: string;
    user_id: string;
    name: string;
    date: Date | string;
    amount: DecimalLike;
    type: TransactionType;
    event_id?: string | null;
}

export interface CreateTransactionParams {
    user_id: string;
    name: string;
    date: Date | string;
    amount: number | DecimalLike;
    type: TransactionType;
    event_id?: string | null;
}

export interface UpdateTransactionParams {
    name?: string;
    date?: Date | string;
    amount?: number | DecimalLike;
    type?: TransactionType;
    event_id?: string | null;
    user_id?: string;
}

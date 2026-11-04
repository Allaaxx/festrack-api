import { Balance } from '../entities/balance.js';
import { TransactionFilters } from './transaction-repository.js';

export interface BalanceRepository {
    getBalance(userId: string, from: string, to: string): Promise<Balance>;
    getBalanceByShopId(
        shopId: string,
        filters?: TransactionFilters,
    ): Promise<Balance>;
}

import { Balance } from '../entities/balance.js';

export interface BalanceRepository {
    getBalance(userId: string, from: string, to: string): Promise<Balance>;
}

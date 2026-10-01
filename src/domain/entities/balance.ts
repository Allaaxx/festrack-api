export type DecimalLike = number | string | { toString(): string };

export interface Balance {
    earnings: DecimalLike;
    expenses: DecimalLike;
    investments: DecimalLike;
    earningsPercentage: number;
    expensePercentage: number;
    investmentsPercentage: number;
    balance: DecimalLike;
}

export type UserBalance = Balance;

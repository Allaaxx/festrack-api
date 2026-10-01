export interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}

export type CreateUserParams = Omit<User, 'id'>;

export type UpdateUserParams = Partial<CreateUserParams>;

export type DecimalLike = number | string | { toString(): string };

export interface UserBalance {
    earnings: DecimalLike;
    expenses: DecimalLike;
    investments: DecimalLike;
    earningsPercentage: number;
    expensePercentage: number;
    investmentsPercentage: number;
    balance: DecimalLike;
}

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export interface UserWithTokens extends User {
    tokens: Tokens;
}

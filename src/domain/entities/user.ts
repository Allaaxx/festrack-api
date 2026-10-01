export interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}

export type CreateUserParams = Omit<User, 'id'>;

export type UpdateUserParams = Partial<CreateUserParams>;

export type { Balance, UserBalance, DecimalLike } from './balance.js';

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export interface UserWithTokens extends User {
    tokens: Tokens;
}

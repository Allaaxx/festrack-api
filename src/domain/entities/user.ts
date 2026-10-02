export interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    name?: string;
    emailVerified?: boolean;
    image?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    password?: string;
}

export type CreateUserParams = Omit<User, 'id'>;

export type UpdateUserParams = Partial<CreateUserParams>;

export type { Balance, UserBalance, DecimalLike } from './balance.js';

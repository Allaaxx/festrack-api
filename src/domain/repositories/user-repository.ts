import {
    User,
    UserAccount,
    CreateUserParams,
    UpdateUserParams,
    UserBalance,
} from '../entities/user.js';

export interface UserRepository {
    create(createUserParams: CreateUserParams): Promise<User>;
    findById(userId: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    update(userId: string, updateUserParams: UpdateUserParams): Promise<User>;
    delete(userId: string): Promise<User>;
    getBalance(userId: string, from: string, to: string): Promise<UserBalance>;
    listAccounts(userId: string): Promise<UserAccount[]>;
    deleteAccount(userId: string, providerId: string): Promise<UserAccount>;
}

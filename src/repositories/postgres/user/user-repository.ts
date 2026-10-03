import { and, eq, sql } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import {
    usersTable,
    transactionsTable,
    account,
} from '../../../db/postgres/schemas/index.js';
import { UserNotFoundError } from '../../../errors/user.js';
import {
    User,
    UserAccount,
    CreateUserParams,
    UpdateUserParams,
    UserBalance,
    UserRepository,
} from '../../../domain/index.js';

export type { UserRepository };

function toCents(val: string | number | null | undefined): bigint {
    if (!val) return 0n;
    const str = String(val).trim();
    if (str === '' || str === '0') return 0n;
    const isNeg = str.startsWith('-');
    const clean = isNeg ? str.slice(1) : str;
    const [intPart = '0', fracPart = ''] = clean.split('.');
    const paddedFrac = (fracPart + '00').slice(0, 2);
    const cents = BigInt(intPart || '0') * 100n + BigInt(paddedFrac);
    return isNeg ? -cents : cents;
}

function fromCents(cents: bigint): string {
    const isNeg = cents < 0n;
    const abs = isNeg ? -cents : cents;
    const intPart = (abs / 100n).toString();
    const fracPart = (abs % 100n).toString().padStart(2, '0');
    const trimmedFrac = fracPart.replace(/0+$/, '');
    const sign = isNeg ? '-' : '';
    return trimmedFrac
        ? `${sign}${intPart}.${trimmedFrac}`
        : `${sign}${intPart}`;
}

export class PostgresUserRepository implements UserRepository {
    constructor(private readonly database: Database = db) {}

    async create(createUserParams: CreateUserParams): Promise<User> {
        const { password: _, ...userData } = createUserParams;
        const [createdUser] = await this.database
            .insert(usersTable)
            .values({
                ...userData,
                name:
                    userData.name ||
                    `${userData.first_name} ${userData.last_name}`.trim(),
            })
            .returning();

        return createdUser;
    }

    async findById(userId: string): Promise<User | null> {
        const [user] = await this.database
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId));

        return user || null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const [user] = await this.database
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

        return user || null;
    }

    async update(
        userId: string,
        updateUserParams: UpdateUserParams,
    ): Promise<User> {
        const { password: _, ...updateData } = updateUserParams;
        const [updatedUser] = await this.database
            .update(usersTable)
            .set(updateData)
            .where(eq(usersTable.id, userId))
            .returning();

        if (!updatedUser) {
            throw new UserNotFoundError(userId);
        }

        return updatedUser;
    }

    async delete(userId: string): Promise<User> {
        const [deletedUser] = await this.database
            .delete(usersTable)
            .where(eq(usersTable.id, userId))
            .returning();

        if (!deletedUser) {
            throw new UserNotFoundError(userId);
        }

        return deletedUser;
    }

    async getBalance(
        userId: string,
        from: string,
        to: string,
    ): Promise<UserBalance> {
        const fromDate = new Date(from).toISOString().slice(0, 10);
        const toDate = new Date(to).toISOString().slice(0, 10);

        const [aggregation] = await this.database
            .select({
                totalEarnings: sql<string>`coalesce(sum(case when ${transactionsTable.type} = 'EARNING' then ${transactionsTable.amount} else 0 end), 0)::text`,
                totalExpenses: sql<string>`coalesce(sum(case when ${transactionsTable.type} = 'EXPENSE' then ${transactionsTable.amount} else 0 end), 0)::text`,
                totalInvestments: sql<string>`coalesce(sum(case when ${transactionsTable.type} = 'INVESTMENT' then ${transactionsTable.amount} else 0 end), 0)::text`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.user_id, userId),
                    sql`${transactionsTable.date} >= ${fromDate}::date`,
                    sql`${transactionsTable.date} <= ${toDate}::date`,
                ),
            );

        const earningsCents = toCents(aggregation?.totalEarnings);
        const expensesCents = toCents(aggregation?.totalExpenses);
        const investmentsCents = toCents(aggregation?.totalInvestments);

        const totalCents = earningsCents + expensesCents + investmentsCents;
        const balanceCents = earningsCents - expensesCents - investmentsCents;

        const earningsPercentage =
            totalCents === 0n ? 0 : Number((earningsCents * 100n) / totalCents);

        const expensePercentage =
            totalCents === 0n ? 0 : Number((expensesCents * 100n) / totalCents);

        const investmentsPercentage =
            totalCents === 0n
                ? 0
                : Number((investmentsCents * 100n) / totalCents);

        return {
            earnings: fromCents(earningsCents),
            expenses: fromCents(expensesCents),
            investments: fromCents(investmentsCents),
            earningsPercentage,
            expensePercentage,
            investmentsPercentage,
            balance: fromCents(balanceCents),
        };
    }

    async listAccounts(userId: string): Promise<UserAccount[]> {
        const accounts = await this.database
            .select({
                id: account.id,
                userId: account.userId,
                providerId: account.providerId,
                accountId: account.accountId,
                password: account.password,
                createdAt: account.createdAt,
                updatedAt: account.updatedAt,
            })
            .from(account)
            .where(eq(account.userId, userId));

        return accounts;
    }

    async deleteAccount(
        userId: string,
        providerId: string,
    ): Promise<UserAccount> {
        const [deletedAccount] = await this.database
            .delete(account)
            .where(
                and(
                    eq(account.userId, userId),
                    eq(account.providerId, providerId),
                ),
            )
            .returning({
                id: account.id,
                userId: account.userId,
                providerId: account.providerId,
                accountId: account.accountId,
                createdAt: account.createdAt,
                updatedAt: account.updatedAt,
            });

        return deletedAccount;
    }
}

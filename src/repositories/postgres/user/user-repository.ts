import { Prisma, TransactionType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { prisma } from '../../../../prisma/prisma.js';
import { UserNotFoundError } from '../../../errors/user.js';
import {
    User,
    CreateUserParams,
    UpdateUserParams,
    UserBalance,
    UserRepository,
} from '../../../domain/index.js';

export type { UserRepository };

export class PostgresUserRepository implements UserRepository {
    async create(createUserParams: CreateUserParams): Promise<User> {
        return await prisma.user.create({
            data: {
                ...createUserParams,
            },
        });
    }

    async findById(userId: string): Promise<User | null> {
        return await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return await prisma.user.findUnique({
            where: {
                email,
            },
        });
    }

    async update(userId: string, updateUserParams: UpdateUserParams): Promise<User> {
        try {
            return await prisma.user.update({
                where: {
                    id: userId,
                },
                data: updateUserParams,
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new UserNotFoundError(userId);
                }
            }

            throw error;
        }
    }

    async delete(userId: string): Promise<User> {
        try {
            return await prisma.user.delete({
                where: {
                    id: userId,
                },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new UserNotFoundError(userId);
                }
            }

            throw error;
        }
    }

    async getBalance(userId: string, from: string, to: string): Promise<UserBalance> {
        const dateFilter = {
            gte: new Date(from),
            lte: new Date(to),
        };

        const {
            _sum: { amount: totalExpense },
        } = await prisma.transaction.aggregate({
            where: {
                user_id: userId,
                type: TransactionType.EXPENSE,
                date: dateFilter,
            },
            _sum: {
                amount: true,
            },
        });

        const {
            _sum: { amount: totalEarnings },
        } = await prisma.transaction.aggregate({
            where: {
                user_id: userId,
                type: TransactionType.EARNING,
                date: dateFilter,
            },
            _sum: {
                amount: true,
            },
        });

        const {
            _sum: { amount: totalInvestments },
        } = await prisma.transaction.aggregate({
            where: {
                user_id: userId,
                type: TransactionType.INVESTMENT,
                date: dateFilter,
            },
            _sum: {
                amount: true,
            },
        });

        const _totalEarnings = totalEarnings || new Prisma.Decimal(0);
        const _totalExpense = totalExpense || new Prisma.Decimal(0);
        const _totalInvestments = totalInvestments || new Prisma.Decimal(0);

        const total = _totalEarnings
            .plus(_totalExpense)
            .plus(_totalInvestments);

        const balance = _totalEarnings
            .minus(_totalExpense)
            .minus(_totalInvestments);

        const earningsPercentage = total.isZero()
            ? 0
            : _totalEarnings.times(100).div(total).floor().toNumber();

        const expensePercentage = total.isZero()
            ? 0
            : _totalExpense.times(100).div(total).floor().toNumber();

        const investmentsPercentage = total.isZero()
            ? 0
            : _totalInvestments.times(100).div(total).floor().toNumber();

        return {
            earnings: _totalEarnings,
            expenses: _totalExpense,
            investments: _totalInvestments,
            earningsPercentage,
            expensePercentage,
            investmentsPercentage,
            balance,
        };
    }
}

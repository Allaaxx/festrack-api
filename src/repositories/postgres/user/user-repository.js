import { Prisma, TransactionType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { prisma } from '../../../../prisma/prisma.js';
import { UserNotFoundError } from '../../../errors/user.js';

export class PostgresUserRepository {
    async create(createUserParams) {
        return await prisma.user.create({
            data: {
                ...createUserParams,
            },
        });
    }

    async findById(userId) {
        return await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });
    }

    async findByEmail(email) {
        return await prisma.user.findUnique({
            where: {
                email,
            },
        });
    }

    async update(userId, updateUserParams) {
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

    async delete(userId) {
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

    async getBalance(userId, from, to) {
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
            : _totalEarnings.times(100).div(total).floor();

        const expensePercentage = total.isZero()
            ? 0
            : _totalExpense.times(100).div(total).floor();

        const investmentsPercentage = total.isZero()
            ? 0
            : _totalInvestments.times(100).div(total).floor();

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

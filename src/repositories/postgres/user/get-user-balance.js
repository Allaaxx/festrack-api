import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../../../../prisma/prisma.js';

export class PostgresGetUserBalanceRepository {
    async execute(userId, from, to) {
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

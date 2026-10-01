import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { prisma } from '../../../../prisma/prisma.js';
import { TransactionNotFoundError } from '../../../errors/transaction.js';
import {
    Transaction,
    CreateTransactionParams,
    UpdateTransactionParams,
    TransactionRepository,
} from '../../../domain/index.js';

export type { TransactionRepository };

export class PostgresTransactionRepository implements TransactionRepository {
    async create(
        createTransactionParams: CreateTransactionParams,
    ): Promise<Transaction> {
        return await prisma.transaction.create({
            data: {
                ...createTransactionParams,
                date: new Date(createTransactionParams.date),
                amount: new Prisma.Decimal(
                    createTransactionParams.amount.toString(),
                ),
            },
        });
    }

    async findById(transactionId: string): Promise<Transaction | null> {
        return await prisma.transaction.findUnique({
            where: {
                id: transactionId,
            },
        });
    }

    async findByUserId(
        userId: string,
        from?: string,
        to?: string,
    ): Promise<Transaction[]> {
        return await prisma.transaction.findMany({
            where: {
                user_id: userId,
                ...(from && to
                    ? {
                          date: {
                              gte: new Date(from),
                              lte: new Date(to),
                          },
                      }
                    : {}),
            },
        });
    }

    async update(
        transactionId: string,
        updateTransactionParams: UpdateTransactionParams,
    ): Promise<Transaction> {
        try {
            return await prisma.transaction.update({
                where: {
                    id: transactionId,
                },
                data: {
                    ...updateTransactionParams,
                    date: updateTransactionParams.date
                        ? new Date(updateTransactionParams.date)
                        : undefined,
                    amount:
                        updateTransactionParams.amount !== undefined
                            ? new Prisma.Decimal(
                                  updateTransactionParams.amount.toString(),
                              )
                            : undefined,
                },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new TransactionNotFoundError(transactionId);
                }
            }

            throw error;
        }
    }

    async delete(transactionId: string): Promise<Transaction> {
        try {
            return await prisma.transaction.delete({
                where: {
                    id: transactionId,
                },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new TransactionNotFoundError(transactionId);
                }
            }

            throw error;
        }
    }
}

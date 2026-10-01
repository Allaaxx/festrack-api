import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { prisma } from '../../../../prisma/prisma.js';
import { TransactionNotFoundError } from '../../../errors/transaction.js';

export class PostgresTransactionRepository {
    async create(createTransactionParams) {
        return await prisma.transaction.create({
            data: createTransactionParams,
        });
    }

    async findById(transactionId) {
        return await prisma.transaction.findUnique({
            where: {
                id: transactionId,
            },
        });
    }

    async findByUserId(userId, from, to) {
        return await prisma.transaction.findMany({
            where: {
                user_id: userId,
                date: {
                    gte: new Date(from),
                    lte: new Date(to),
                },
            },
        });
    }

    async update(transactionId, updateTransactionParams) {
        try {
            return await prisma.transaction.update({
                where: {
                    id: transactionId,
                },
                data: updateTransactionParams,
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

    async delete(transactionId) {
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

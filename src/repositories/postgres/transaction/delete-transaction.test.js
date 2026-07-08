import { prisma } from "../../../../prisma/prisma";
import { PostgresDeleteTransactionRepository } from "./delete-transaction";
import { transaction, user } from "../../../tests";
import dayjs from "dayjs";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { TransactionNotFoundError } from "../../../errors";

describe('Postgres Delete Transaction Repository', () => {
    it('should delete a transaction on db', async () => {
        await prisma.user.create({ data: user });
        await prisma.transaction.create({
            data: { ...transaction, user_id: user.id }
        });

        const sut = new PostgresDeleteTransactionRepository();

        const result = await sut.execute(transaction.id);

        expect(result.name).toBe(transaction.name);
        expect(result.type).toBe(transaction.type);
        expect(result.user_id).toBe(user.id);
        expect(String(result.amount)).toBe(String(transaction.amount));
        expect(dayjs(result.date).daysInMonth()).toBe(
            dayjs(transaction.date).daysInMonth()
        );
        expect(dayjs(result.date).month()).toBe(dayjs(transaction.date).month());
        expect(dayjs(result.date).year()).toBe(dayjs(transaction.date).year());
    });

    it('should call Prisma with correct params', async () => {
        await prisma.user.create({ data: user });
        await prisma.transaction.create({
            data: { ...transaction, user_id: user.id }
        });
        const prismaSpy = jest.spyOn(prisma.transaction, 'delete');
        const sut = new PostgresDeleteTransactionRepository();


        await sut.execute(transaction.id);

        expect(prismaSpy).toHaveBeenCalledWith({ where: { id: transaction.id } });
    });

    it('should throw generic error if Prisma throws generic error', async () => {
        const sut = new PostgresDeleteTransactionRepository();
        jest.spyOn(prisma.transaction, 'delete').mockRejectedValue(new Error());

        const promise = sut.execute(transaction.id);
        await expect(promise).rejects.toThrow();
    });

    it('should throw TransactionNotFoundError if Prisma throws P2025', async () => {
        const sut = new PostgresDeleteTransactionRepository();
        jest.spyOn(prisma.transaction, 'delete').mockRejectedValue(
            new PrismaClientKnownRequestError('', {
                code: 'P2025'
            })
        );

        const promise = sut.execute(transaction.id);

        expect(promise).rejects.toThrow(new TransactionNotFoundError(transaction.id));
    });
});
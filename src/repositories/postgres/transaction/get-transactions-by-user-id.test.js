import { prisma } from "../../../../prisma/prisma";
import { PostgresGetTransactionsByUserIdRepository } from "./get-transactions-by-user-id";
import { transaction, user } from "../../../tests";
import dayjs from "dayjs";

describe('Postgres Get Transactions By User Id Repository', () => {
    it('should return transactions of the provided user', async () => {

        const sut = new PostgresGetTransactionsByUserIdRepository();

        await prisma.user.create({ data: user });
        await prisma.transaction.create({
            data: { ...transaction, user_id: user.id }
        });

        const result = await sut.execute(user.id);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe(transaction.name);
        expect(result[0].type).toBe(transaction.type);
        expect(result[0].user_id).toBe(user.id);
        expect(String(result[0].amount)).toBe(String(transaction.amount));
        expect(dayjs(result[0].date).daysInMonth()).toBe(
            dayjs(transaction.date).daysInMonth()
        );
        expect(dayjs(result[0].date).month()).toBe(dayjs(transaction.date).month());
        expect(dayjs(result[0].date).year()).toBe(dayjs(transaction.date).year());
    });

    it('should return an empty array if no transactions are found', async () => {
        await prisma.user.create({ data: user });

        const sut = new PostgresGetTransactionsByUserIdRepository();
        const result = await sut.execute(user.id);

        expect(result).toEqual([]);
    });

    it('should call Prisma with correct params', async () => {
        const prismaSpy = jest.spyOn(prisma.transaction, 'findMany');
        const sut = new PostgresGetTransactionsByUserIdRepository();

        await sut.execute(user.id);

        expect(prismaSpy).toHaveBeenCalledWith({ where: { user_id: user.id } });
    });
});
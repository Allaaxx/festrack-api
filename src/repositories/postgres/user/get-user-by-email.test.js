import { PostgresGetUserByEmailRepository } from './get-user-by-email.js';
import { prisma } from '../../../../prisma/prisma.js';
import { user as fakeUser } from '../../../tests/index.js';

describe('Get user by email repository', () => {
    it('should get user by email on db', async () => {
        await prisma.user.create({ data: fakeUser });

        const sut = new PostgresGetUserByEmailRepository();

        const result = await sut.execute(fakeUser.email);

        expect(result).toStrictEqual(fakeUser);
    });

    it('should call Prisma with correct params', async () => {
        const sut = new PostgresGetUserByEmailRepository();

        const prismaSpy = jest.spyOn(prisma.user, 'findUnique');

        await sut.execute(fakeUser.email);

        expect(prismaSpy).toHaveBeenCalledWith({
            where: {
                email: fakeUser.email,
            },
        });
    });

    it('should throw if Prisma throws', async () => {
        const sut = new PostgresGetUserByEmailRepository();
        jest.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(fakeUser.email);

        await expect(promise).rejects.toThrow();
    });
});

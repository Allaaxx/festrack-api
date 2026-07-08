import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { prisma } from '../../../../prisma/prisma';
import { user } from '../../../tests';
import { PostgresDeleteUserRepository } from './delete-user';
import { UserNotFoundError } from '../../../errors';

describe('Delete User Repository', () => {
    it('should delete a user on db', async () => {
        await prisma.user.create({
            data: user,
        });

        const sut = new PostgresDeleteUserRepository();

        const result = await sut.execute(user.id);

        expect(result).toStrictEqual(user);
    });

    it('should call Prisma with correct params', async () => {
        await prisma.user.create({
            data: user,
        });
        const sut = new PostgresDeleteUserRepository();

        const prismaSpy = jest.spyOn(prisma.user, 'delete');

        await sut.execute(user.id);

        expect(prismaSpy).toHaveBeenCalledWith({
            where: {
                id: user.id,
            },
        });
    });

    it('should throw UserNotFoundError if Prisma throws P2025', async () => {
        const sut = new PostgresDeleteUserRepository();
        jest.spyOn(prisma.user, 'delete').mockRejectedValue(
            new PrismaClientKnownRequestError('', { code: 'P2025' }),
        );

        const promise = sut.execute(user.id);

        await expect(promise).rejects.toThrow(new UserNotFoundError(user.id));
    });

    it('should throw generic error if Prisma throws generic error', async () => {
        const sut = new PostgresDeleteUserRepository();
        jest.spyOn(prisma.user, 'delete').mockRejectedValue(new Error());

        const promise = sut.execute(user.id);
        await expect(promise).rejects.toThrow();
    });
});

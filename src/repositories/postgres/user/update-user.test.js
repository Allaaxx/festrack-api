import { PostgresUpdateUserRepository } from './update-user.js';
import { prisma } from '../../../../prisma/prisma.js';
import { user as fakeUser } from '../../../tests';
import { faker } from '@faker-js/faker';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UserNotFoundError } from '../../../errors/user.js';

describe('Postgres Update User Repository', () => {
    const updateUserParams = {
        id: faker.string.uuid(),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: faker.internet.email(),
        password: faker.internet.password()
    };

    it('should update user on db', async () => {
        const user = await prisma.user.create({ data: fakeUser });

        const sut = new PostgresUpdateUserRepository();



        const result = await sut.execute(user.id, updateUserParams);

        expect(result).toStrictEqual(updateUserParams);
    });


    it('should call Prisma with correct params', async () => {
        const user = await prisma.user.create({ data: fakeUser });

        const sut = new PostgresUpdateUserRepository();

        const prismaSpy = jest.spyOn(prisma.user, 'update');

        await sut.execute(user.id, updateUserParams);

        expect(prismaSpy).toHaveBeenCalledWith({
            where: {
                id: user.id
            },
            data: updateUserParams,
        });
    });

    it('should throw if Prisma throws', async () => {
        const sut = new PostgresUpdateUserRepository();
        jest.spyOn(prisma.user, 'update').mockRejectedValueOnce(new Error());

        const promise = sut.execute(fakeUser.id, updateUserParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw UserNotFoundError if Prisma throws P2025', async () => {
        const sut = new PostgresUpdateUserRepository();
        jest.spyOn(prisma.user, 'update').mockRejectedValueOnce(
            new PrismaClientKnownRequestError('', { code: 'P2025' })
        );

        const promise = sut.execute(updateUserParams.id);

        await expect(promise).rejects.toThrow(new UserNotFoundError(updateUserParams.id));
    });
});
import { faker } from '@faker-js/faker';
import { UserNotFoundError } from '../../errors/user';
import { user, userBalance } from '../../tests';
import { GetUserBalanceUseCase } from './get-user-balance.js';

describe('Get User Balance Use Case', () => {
    const from = '2024-01-01';
    const to = '2027-12-23';

    class GetUserBalanceRepositoryStub {
        async execute() {
            return userBalance;
        }
    }
    class GetUserByIdRepositoryStub {
        async execute() {
            return user;
        }
    }

    const makeSut = () => {
        const getUserBalanceRepository = new GetUserBalanceRepositoryStub();
        const getUserByIdRepository = new GetUserByIdRepositoryStub();
        const sut = new GetUserBalanceUseCase(
            getUserBalanceRepository,
            getUserByIdRepository,
        );

        return {
            sut,
            getUserBalanceRepository,
            getUserByIdRepository,
        };
    };

    it('should get user balance successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(faker.string.uuid());

        expect(result).toEqual(userBalance);
    });

    it('should throw UserNotFoundError if GetUserByIdRepository returns null', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockResolvedValue(null);
        const userId = faker.string.uuid();

        const promise = sut.execute(userId);

        await expect(promise).rejects.toThrow(new UserNotFoundError(userId));
    });

    it('should call GetUserByIdRepository with correct params', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        const userId = faker.string.uuid();
        const executeSpy = jest.spyOn(getUserByIdRepository, 'execute');

        await sut.execute(userId);

        expect(executeSpy).toHaveBeenCalledWith(userId);
    });

    it('should call GetUserBalanceRepository with correct params', async () => {
        const { sut, getUserBalanceRepository } = makeSut();
        const userId = faker.string.uuid();
        const executeSpy = jest.spyOn(getUserBalanceRepository, 'execute');

        await sut.execute(userId, from, to);

        expect(executeSpy).toHaveBeenCalledWith(userId, from, to);
    });

    it('should throw if GetUserByIdRepository throws', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockRejectedValue(
            new Error(),
        );

        const promise = sut.execute(faker.string.uuid());

        await expect(promise).rejects.toThrow();
    });

    it('should throw if GetUserBalanceRepository throws', async () => {
        const { sut, getUserBalanceRepository } = makeSut();
        jest.spyOn(getUserBalanceRepository, 'execute').mockRejectedValue(
            new Error(),
        );

        const promise = sut.execute(faker.string.uuid());

        await expect(promise).rejects.toThrow();
    });
});

import { faker } from '@faker-js/faker';
import { UserNotFoundError } from '../../errors/user';
import { user, userBalance } from '../../tests';
import { GetUserBalanceUseCase } from './get-user-balance.js';

describe('Get User Balance Use Case', () => {
    const from = '2024-01-01';
    const to = '2027-12-23';

    class UserRepositoryStub {
        async getBalance() {
            return userBalance;
        }

        async findById() {
            return user;
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub();
        const sut = new GetUserBalanceUseCase(userRepository);

        return {
            sut,
            userRepository,
        };
    };

    it('should get user balance successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(faker.string.uuid());

        expect(result).toEqual(userBalance);
    });

    it('should throw UserNotFoundError if findById returns null', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValue(null);
        const userId = faker.string.uuid();

        const promise = sut.execute(userId);

        await expect(promise).rejects.toThrow(new UserNotFoundError(userId));
    });

    it('should call userRepository.findById with correct params', async () => {
        const { sut, userRepository } = makeSut();
        const userId = faker.string.uuid();
        const executeSpy = jest.spyOn(userRepository, 'findById');

        await sut.execute(userId);

        expect(executeSpy).toHaveBeenCalledWith(userId);
    });

    it('should call userRepository.getBalance with correct params', async () => {
        const { sut, userRepository } = makeSut();
        const userId = faker.string.uuid();
        const executeSpy = jest.spyOn(userRepository, 'getBalance');

        await sut.execute(userId, from, to);

        expect(executeSpy).toHaveBeenCalledWith(userId, from, to);
    });

    it('should throw if userRepository.findById throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockRejectedValue(new Error());

        const promise = sut.execute(faker.string.uuid());

        await expect(promise).rejects.toThrow();
    });

    it('should throw if userRepository.getBalance throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'getBalance').mockRejectedValue(new Error());

        const promise = sut.execute(faker.string.uuid());

        await expect(promise).rejects.toThrow();
    });
});

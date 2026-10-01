import { faker } from '@faker-js/faker';
import { UserNotFoundError } from '../../errors/user.js';
import { user, userBalance } from '../../tests/index.js';
import { GetUserBalanceUseCase } from './get-user-balance.js';
import { User, UserBalance } from '../../domain/entities/user.js';

describe('Get User Balance Use Case', () => {
    const from = '2024-01-01';
    const to = '2027-12-23';

    class UserRepositoryStub {
        async getBalance(): Promise<UserBalance> {
            return userBalance;
        }

        async findById(): Promise<User | null> {
            return user;
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub();
        const getUserBalanceUseCase = new GetUserBalanceUseCase(userRepository);

        return {
            getUserBalanceUseCase,
            userRepository,
        };
    };

    it('should get user balance successfully', async () => {
        const { getUserBalanceUseCase } = makeSut();

        const result = await getUserBalanceUseCase.execute(faker.string.uuid(), from, to);

        expect(result).toEqual(userBalance);
    });

    it('should throw UserNotFoundError if findById returns null', async () => {
        const { getUserBalanceUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValue(null);
        const userId = faker.string.uuid();

        const promise = getUserBalanceUseCase.execute(userId, from, to);

        await expect(promise).rejects.toThrow(new UserNotFoundError(userId));
    });

    it('should call userRepository.findById with correct params', async () => {
        const { getUserBalanceUseCase, userRepository } = makeSut();
        const userId = faker.string.uuid();
        const executeSpy = jest.spyOn(userRepository, 'findById');

        await getUserBalanceUseCase.execute(userId, from, to);

        expect(executeSpy).toHaveBeenCalledWith(userId);
    });

    it('should call userRepository.getBalance with correct params', async () => {
        const { getUserBalanceUseCase, userRepository } = makeSut();
        const userId = faker.string.uuid();
        const executeSpy = jest.spyOn(userRepository, 'getBalance');

        await getUserBalanceUseCase.execute(userId, from, to);

        expect(executeSpy).toHaveBeenCalledWith(userId, from, to);
    });

    it('should throw if userRepository.findById throws', async () => {
        const { getUserBalanceUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockRejectedValue(new Error());

        const promise = getUserBalanceUseCase.execute(faker.string.uuid(), from, to);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if userRepository.getBalance throws', async () => {
        const { getUserBalanceUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'getBalance').mockRejectedValue(new Error());

        const promise = getUserBalanceUseCase.execute(faker.string.uuid(), from, to);

        await expect(promise).rejects.toThrow();
    });
});

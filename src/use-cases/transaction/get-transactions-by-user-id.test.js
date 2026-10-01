import { faker } from '@faker-js/faker';
import { UserNotFoundError } from '../../errors/user';
import { user } from '../../tests/index.js';
import { GetTransactionByUserIdUseCase } from './get-transactions-by-user-id.js';

describe('Get Transactions By User Id Use Case', () => {
    class TransactionRepositoryStub {
        async findByUserId() {
            return [];
        }
    }

    class UserRepositoryStub {
        async findById() {
            return user;
        }
    }

    const makeSut = () => {
        const transactionRepository = new TransactionRepositoryStub();
        const userRepository = new UserRepositoryStub();
        const sut = new GetTransactionByUserIdUseCase(
            transactionRepository,
            userRepository,
        );

        return {
            sut,
            transactionRepository,
            userRepository,
        };
    };

    it('should get transactions by user id successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(faker.string.uuid());

        expect(result).toEqual([]);
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(null);
        const id = faker.string.uuid();

        const promise = sut.execute(id);

        await expect(promise).rejects.toThrow(new UserNotFoundError(id));
    });

    it('should call userRepository.findById with correct params', async () => {
        const { sut, userRepository } = makeSut();
        const findByIdSpy = jest.spyOn(userRepository, 'findById');
        const id = faker.string.uuid();

        await sut.execute(id);

        expect(findByIdSpy).toHaveBeenCalledWith(id);
    });

    it('should call transactionRepository.findByUserId with correct params', async () => {
        const { sut, transactionRepository } = makeSut();
        const spy = jest.spyOn(transactionRepository, 'findByUserId');
        const id = faker.string.uuid();
        const from = faker.date.past().toISOString();
        const to = faker.date.future().toISOString();

        await sut.execute(id, from, to);

        expect(spy).toHaveBeenCalledWith(id, from, to);
    });

    it('should throw if userRepository.findById throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockRejectedValueOnce(
            new Error(),
        );
        const id = faker.string.uuid();

        const promise = sut.execute(id);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if transactionRepository.findByUserId throws', async () => {
        const { sut, transactionRepository } = makeSut();
        jest.spyOn(transactionRepository, 'findByUserId').mockRejectedValueOnce(
            new Error(),
        );
        const id = faker.string.uuid();

        const promise = sut.execute(id);

        await expect(promise).rejects.toThrow();
    });
});

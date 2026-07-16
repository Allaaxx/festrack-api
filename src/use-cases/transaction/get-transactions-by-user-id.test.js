import { faker } from '@faker-js/faker';
import { UserNotFoundError } from '../../errors/user';
import { user } from '../../tests/index.js';
import { GetTransactionByUserIdUseCase } from './get-transactions-by-user-id.js';
describe('Get Transactions By User Id Use Case', () => {
    class GetTransactionByUserIdRepositoryStub {
        async execute() {
            return [];
        }
    }

    class GetUserByIdRepositoryStub {
        async execute() {
            return user;
        }
    }

    const makeSut = () => {
        const getTransactionsByUserIdRepository =
            new GetTransactionByUserIdRepositoryStub();
        const getUserByIdRepository = new GetUserByIdRepositoryStub();
        const sut = new GetTransactionByUserIdUseCase(
            getTransactionsByUserIdRepository,
            getUserByIdRepository,
        );

        return {
            sut,
            getTransactionsByUserIdRepository,
            getUserByIdRepository,
        };
    };

    it('should get transactions by user id successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(faker.string.uuid());

        expect(result).toEqual([]);
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockResolvedValueOnce(
            null,
        );
        const id = faker.string.uuid();

        const promise = sut.execute(id);

        await expect(promise).rejects.toThrow(new UserNotFoundError(id));
    });

    it('should call GetUserByIdRepository with correct params', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        const getUserByIdRepositorySpy = jest.spyOn(
            getUserByIdRepository,
            'execute',
        );
        const id = faker.string.uuid();

        await sut.execute(id);

        expect(getUserByIdRepositorySpy).toHaveBeenCalledWith(id);
    });

    it('should call GetTransactionsByUserIdRepository with correct params', async () => {
        const { sut, getTransactionsByUserIdRepository } = makeSut();
        const getTransactionsByUserIdRepositorySpy = jest.spyOn(
            getTransactionsByUserIdRepository,
            'execute',
        );
        const id = faker.string.uuid();
        const from = faker.date.past().toISOString();
        const to = faker.date.future().toISOString();

        await sut.execute(id, from, to);

        expect(getTransactionsByUserIdRepositorySpy).toHaveBeenCalledWith(
            id,
            from,
            to,
        );
    });

    it('should throw if GetUserByIdRepository throws', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );
        const id = faker.string.uuid();

        const promise = sut.execute(id);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if GetTransactionsByUserIdRepository throws', async () => {
        const { sut, getTransactionsByUserIdRepository } = makeSut();
        jest.spyOn(
            getTransactionsByUserIdRepository,
            'execute',
        ).mockRejectedValueOnce(new Error());
        const id = faker.string.uuid();

        const promise = sut.execute(id);

        await expect(promise).rejects.toThrow();
    });
});

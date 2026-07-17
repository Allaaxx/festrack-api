import { faker } from '@faker-js/faker';
import { transaction } from '../../tests/index.js';
import { DeleteTransactionUseCase } from './delete-transaction.js';
import { ForbiddenError } from '../../errors/auth.js';

describe('Delte Transaction Use Case', () => {
    const user_id = faker.string.uuid();
    class DeleteTransactionRepositoryStub {
        async execute() {
            return {
                ...transaction,
                user_id,
            };
        }
    }

    class GetTransactionByIdRepositoryStub {
        async execute() {
            return {
                ...transaction,
                user_id,
            };
        }
    }

    const makeSut = () => {
        const deleteTransactionRepository =
            new DeleteTransactionRepositoryStub();
        const getTransactionByIdRepository =
            new GetTransactionByIdRepositoryStub();
        const sut = new DeleteTransactionUseCase(
            deleteTransactionRepository,
            getTransactionByIdRepository,
        );

        return {
            sut,
            getTransactionByIdRepository,
            deleteTransactionRepository,
        };
    };

    it('should delete a transaction successfully', async () => {
        const { sut } = makeSut();
        const id = faker.string.uuid();

        const result = await sut.execute(id, user_id);

        expect(result).toEqual({ ...transaction, user_id });
    });

    it('should call DeleteTransactionRepository with correct params', async () => {
        const { sut, deleteTransactionRepository } = makeSut();
        const deleteTransactionRepositorySpy = jest.spyOn(
            deleteTransactionRepository,
            'execute',
        );
        const id = faker.string.uuid();

        await sut.execute(id, user_id);

        expect(deleteTransactionRepositorySpy).toHaveBeenCalledWith(id);
    });

    it('should throw if DeleteTransactionRepository throws', async () => {
        const { sut, deleteTransactionRepository } = makeSut();
        jest.spyOn(
            deleteTransactionRepository,
            'execute',
        ).mockRejectedValueOnce(new Error());
        const id = faker.string.uuid();

        const promise = sut.execute(id, user_id);

        await expect(promise).rejects.toThrow();
    });

    it('should throw ForbiddenError if user_id from transaction is different from user_id from params', async () => {
        const { sut } = makeSut();
        const id = faker.string.uuid();

        const promise = sut.execute(id, faker.string.uuid());

        await expect(promise).rejects.toThrow(ForbiddenError);
    });
});

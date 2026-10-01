import { faker } from '@faker-js/faker';
import { transaction } from '../../tests/index.js';
import { DeleteTransactionUseCase } from './delete-transaction.js';
import { ForbiddenError } from '../../errors/auth.js';
import { Transaction, TransactionRepository } from '../../domain/index.js';

describe('Delete Transaction Use Case', () => {
    const user_id = faker.string.uuid();
    class TransactionRepositoryStub implements Pick<
        TransactionRepository,
        'findById' | 'delete'
    > {
        async findById(): Promise<Transaction | null> {
            return {
                ...transaction,
                user_id,
            };
        }

        async delete(): Promise<Transaction> {
            return {
                ...transaction,
                user_id,
            };
        }
    }

    const makeSut = () => {
        const transactionRepository = new TransactionRepositoryStub();
        const sut = new DeleteTransactionUseCase(transactionRepository);

        return {
            sut,
            transactionRepository,
        };
    };

    it('should delete a transaction successfully', async () => {
        const { sut } = makeSut();
        const id = faker.string.uuid();

        const result = await sut.execute(id, user_id);

        expect(result).toEqual({ ...transaction, user_id });
    });

    it('should call transactionRepository.delete with correct params', async () => {
        const { sut, transactionRepository } = makeSut();
        const deleteSpy = jest.spyOn(transactionRepository, 'delete');
        const id = faker.string.uuid();

        await sut.execute(id, user_id);

        expect(deleteSpy).toHaveBeenCalledWith(id);
    });

    it('should throw if transactionRepository.delete throws', async () => {
        const { sut, transactionRepository } = makeSut();
        jest.spyOn(transactionRepository, 'delete').mockRejectedValueOnce(
            new Error(),
        );
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

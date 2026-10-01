import { faker } from '@faker-js/faker';
import { transaction } from '../../tests/index.js';
import { DeleteTransactionController } from './delete-transaction.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';
import { Transaction } from '../../domain/index.js';
import { DeleteTransactionUseCase } from '../../use-cases/index.js';

describe('Delete Transaction Controller', () => {
    class DeleteTransactionUseCaseStub implements Pick<
        DeleteTransactionUseCase,
        'execute'
    > {
        async execute(): Promise<Transaction> {
            return transaction;
        }
    }
    const makeSut = () => {
        const deleteTransactionUseCase = new DeleteTransactionUseCaseStub();
        const sut = new DeleteTransactionController(deleteTransactionUseCase);

        return { sut, deleteTransactionUseCase };
    };

    it('should return 200 when deleting a transaction successfully', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            params: {
                transactionId: faker.string.uuid(),
                user_id: faker.string.uuid(),
            },
        });

        expect(response.statusCode).toBe(200);
    });

    it('should return 400 when id is invalid', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            params: {
                transactionId: 'invalid_id',
                user_id: faker.string.uuid(),
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 404 when transaction is not found', async () => {
        const { sut, deleteTransactionUseCase } = makeSut();
        jest.spyOn(deleteTransactionUseCase, 'execute').mockRejectedValueOnce(
            new TransactionNotFoundError(faker.string.uuid()),
        );
        const response = await sut.execute({
            params: {
                transactionId: faker.string.uuid(),
                user_id: faker.string.uuid(),
            },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 500 when DeleteTransactionUseCase throws', async () => {
        const { sut, deleteTransactionUseCase } = makeSut();
        jest.spyOn(deleteTransactionUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );
        const response = await sut.execute({
            params: {
                transactionId: faker.string.uuid(),
                user_id: faker.string.uuid(),
            },
        });

        expect(response.statusCode).toBe(500);
    });

    it('should call DeleteTransactionUseCase with correct values', async () => {
        const { sut, deleteTransactionUseCase } = makeSut();
        const executeSpy = jest.spyOn(deleteTransactionUseCase, 'execute');

        const transactionId = faker.string.uuid();
        const userId = faker.string.uuid();

        await sut.execute({
            params: {
                transactionId,
                user_id: userId,
            },
        });

        expect(executeSpy).toHaveBeenCalledWith(transactionId, userId);
    });

    it('should return 404 when use case returns null', async () => {
        const { sut, deleteTransactionUseCase } = makeSut();
        jest.spyOn(deleteTransactionUseCase, 'execute').mockResolvedValueOnce(
            null as any,
        );

        const response = await sut.execute({
            params: {
                transactionId: faker.string.uuid(),
                user_id: faker.string.uuid(),
            },
        });

        expect(response.statusCode).toBe(404);
    });
});

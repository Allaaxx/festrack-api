import { TransactionNotFoundError } from '../../errors/transaction.js';
import { ForbiddenError } from '../../errors/user.js';
import { transaction } from '../../tests/index.js';
import { UpdateTransactionController } from './update-transaction.js';
import { faker } from '@faker-js/faker';

describe('Update Transaction Controller', () => {
    class UpdateTransactionUseCaseStub {
        async execute() {
            return transaction;
        }
    }

    const makeSut = () => {
        const updateTransactionUseCase = new UpdateTransactionUseCaseStub();
        const sut = new UpdateTransactionController(updateTransactionUseCase);

        return { sut, updateTransactionUseCase };
    };

    const baseHttpRequest = {
        params: { transactionId: faker.string.uuid() },
        body: {
            name: faker.commerce.productName(),
            date: faker.date.anytime().toISOString(),
            type: 'EXPENSE',
            amount: Number(faker.finance.amount()),
        },
    };

    it('should return 200 when updating a transaction successfully', async () => {
        const { sut } = makeSut();

        const response = await sut.execute(baseHttpRequest);
        expect(response.statusCode).toBe(200);
    });

    it('should return 400 when an invalid id is provided', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            params: { transactionId: 'invalid_id' },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when an invalid amount is provided', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            params: baseHttpRequest.params,
            body: { ...baseHttpRequest.body, amount: 'invalid_amount' },
        });
        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when an invalid type is provided', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            params: baseHttpRequest.params,
            body: { ...baseHttpRequest.body, type: 'INVALID' },
        });
        expect(response.statusCode).toBe(400);
    });

    it('should return 403 when user_id is not the owner', async () => {
        const { sut, updateTransactionUseCase } = makeSut();
        jest.spyOn(updateTransactionUseCase, 'execute').mockRejectedValueOnce(
            new ForbiddenError('user_id'),
        );

        const response = await sut.execute({
            params: baseHttpRequest.params,
            body: { ...baseHttpRequest.body },
        });
        expect(response.statusCode).toBe(403);
    });

    it('should return 500 when UpdateTransactionUseCase throws', async () => {
        const { sut, updateTransactionUseCase } = makeSut();
        jest.spyOn(updateTransactionUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );
        const response = await sut.execute(baseHttpRequest);
        expect(response.statusCode).toBe(500);
    });

    it('should return 404 when TransactionNotFoundError is thrown', async () => {
        const { sut, updateTransactionUseCase } = makeSut();
        jest.spyOn(updateTransactionUseCase, 'execute').mockRejectedValueOnce(
            new TransactionNotFoundError(baseHttpRequest.params.transactionId),
        );
        const response = await sut.execute(baseHttpRequest);
        expect(response.statusCode).toBe(404);
    });

    it('should call UpdateTransactionUseCase with correct values', async () => {
        const { sut, updateTransactionUseCase } = makeSut();
        const executeSpy = jest.spyOn(updateTransactionUseCase, 'execute');
        await sut.execute(baseHttpRequest);
        expect(executeSpy).toHaveBeenCalledWith(
            baseHttpRequest.params.transactionId,
            baseHttpRequest.body,
        );
    });
});

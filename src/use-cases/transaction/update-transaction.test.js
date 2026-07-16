import { faker } from '@faker-js/faker';
import { transaction } from '../../tests/index.js';
import { UpdateTransactionUseCase } from './update-transaction.js';

describe('Update Transaction Use Case', () => {
    class UpdateTransactionRepositoryStub {
        async execute() {
            return transaction;
        }
    }

    class GetTransactionByIdStub {
        async execute() {
            return transaction;
        }
    }

    const makeSut = () => {
        const updateTransactionRepository =
            new UpdateTransactionRepositoryStub();
        const getTransactionByIdRepository = new GetTransactionByIdStub();
        const sut = new UpdateTransactionUseCase(
            updateTransactionRepository,
            getTransactionByIdRepository,
        );

        return {
            sut,
            updateTransactionRepository,
            getTransactionByIdRepository,
        };
    };

    it('should create a transaction successfully', async () => {
        const { sut } = makeSut();
        const result = await sut.execute(transaction.id, {
            amount: Number(faker.finance.amount()),
        });

        expect(result).toEqual(transaction);
    });

    it('should call UpdateTransactionRepository with correct params', async () => {
        const { sut, updateTransactionRepository } = makeSut();
        const updateTransactionRepositorySpy = jest.spyOn(
            updateTransactionRepository,
            'execute',
        );

        await sut.execute(transaction.id, {
            amount: transaction.amount,
        });

        expect(updateTransactionRepositorySpy).toHaveBeenCalledWith(
            transaction.id,
            {
                amount: transaction.amount,
            },
        );
    });

    it('should throw if UpdateTransactionRepository throws', async () => {
        const { sut, updateTransactionRepository } = makeSut();
        jest.spyOn(
            updateTransactionRepository,
            'execute',
        ).mockRejectedValueOnce(new Error());

        const promise = sut.execute(transaction.id, {
            amount: transaction.amount,
        });

        await expect(promise).rejects.toThrow();
    });

    it('should throw 403 if user_id is different from transaction owner', async () => {
        const { sut } = makeSut();
        const promise = sut.execute(transaction.id, {
            user_id: faker.string.uuid(),
        });

        await expect(promise).rejects.toThrow();
    });
});

import { faker } from '@faker-js/faker';
import { transaction } from '../../tests/index.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/auth.js';
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

    class GetEventByIdStub {
        async execute() {
            return { id: 'valid_event_id', user_id: transaction.user_id };
        }
    }

    const makeSut = () => {
        const updateTransactionRepository =
            new UpdateTransactionRepositoryStub();
        const getTransactionByIdRepository = new GetTransactionByIdStub();
        const getEventByIdRepository = new GetEventByIdStub();
        const sut = new UpdateTransactionUseCase(
            updateTransactionRepository,
            getTransactionByIdRepository,
            getEventByIdRepository,
        );

        return {
            sut,
            updateTransactionRepository,
            getTransactionByIdRepository,
            getEventByIdRepository,
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

    it('should throw EventNotFoundError if event does not exist', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockResolvedValueOnce(
            null,
        );

        const promise = sut.execute(transaction.id, {
            event_id: 'non-existing-event',
        });

        await expect(promise).rejects.toThrow(
            new EventNotFoundError('non-existing-event'),
        );
    });

    it('should throw ForbiddenError if event belongs to another user', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockResolvedValueOnce({
            id: 'event-id',
            user_id: 'different-user-id',
        });

        const promise = sut.execute(transaction.id, {
            event_id: 'event-id',
        });

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });
});

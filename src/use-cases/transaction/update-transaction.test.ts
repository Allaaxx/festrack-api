import { faker } from '@faker-js/faker';
import { transaction } from '../../tests/index.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/auth.js';
import { UpdateTransactionUseCase } from './update-transaction.js';
import {
    Event,
    EventRepository,
    Transaction,
    TransactionRepository,
} from '../../domain/index.js';

describe('Update Transaction Use Case', () => {
    class TransactionRepositoryStub implements Pick<
        TransactionRepository,
        'findById' | 'update'
    > {
        async findById(): Promise<Transaction | null> {
            return transaction;
        }

        async update(): Promise<Transaction> {
            return transaction;
        }
    }

    class EventRepositoryStub implements Pick<EventRepository, 'findById'> {
        async findById(): Promise<Event | null> {
            return {
                id: 'valid_event_id',
                name: 'valid_event_name',
                description: null,
                start_date: '2026-09-15',
                end_date: '2026-09-16',
                user_id: transaction.user_id,
            };
        }
    }

    const makeSut = () => {
        const transactionRepository = new TransactionRepositoryStub();
        const eventRepository = new EventRepositoryStub();
        const sut = new UpdateTransactionUseCase(
            transactionRepository,
            eventRepository,
        );

        return {
            sut,
            transactionRepository,
            eventRepository,
        };
    };

    it('should update a transaction successfully', async () => {
        const { sut } = makeSut();
        const result = await sut.execute(transaction.id, {
            amount: Number(faker.finance.amount()),
        });

        expect(result).toEqual(transaction);
    });

    it('should call transactionRepository.update with correct params', async () => {
        const { sut, transactionRepository } = makeSut();
        const updateSpy = jest.spyOn(transactionRepository, 'update');

        await sut.execute(transaction.id, {
            amount: transaction.amount,
        });

        expect(updateSpy).toHaveBeenCalledWith(transaction.id, {
            amount: transaction.amount,
        });
    });

    it('should throw if transactionRepository.update throws', async () => {
        const { sut, transactionRepository } = makeSut();
        jest.spyOn(transactionRepository, 'update').mockRejectedValueOnce(
            new Error(),
        );

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
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(transaction.id, {
            event_id: 'non-existing-event',
        });

        await expect(promise).rejects.toThrow(
            new EventNotFoundError('non-existing-event'),
        );
    });

    it('should throw ForbiddenError if event belongs to another user', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            id: 'event-id',
            name: 'event_name',
            description: null,
            start_date: '2026-09-15',
            end_date: '2026-09-16',
            user_id: 'different-user-id',
        });

        const promise = sut.execute(transaction.id, {
            event_id: 'event-id',
        });

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });
});

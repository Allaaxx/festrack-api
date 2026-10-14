import { faker } from '@faker-js/faker';
import { UserNotFoundError } from '../../errors/user.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/auth.js';
import { user } from '../../tests/index.js';
import { GetTransactionByUserIdUseCase } from './get-transactions-by-user-id.js';
import {
    Event,
    EventRepository,
    Transaction,
    TransactionRepository,
    User,
    UserRepository,
} from '../../domain/index.js';

describe('Get Transactions By User Id Use Case', () => {
    class TransactionRepositoryStub implements Pick<
        TransactionRepository,
        'findByUserId'
    > {
        async findByUserId(): Promise<Transaction[]> {
            return [];
        }
    }

    class UserRepositoryStub implements Pick<UserRepository, 'findById'> {
        async findById(): Promise<User | null> {
            return user;
        }
    }

    class EventRepositoryStub implements Pick<EventRepository, 'findById'> {
        async findById(): Promise<Event | null> {
            return {
                id: 'valid_event_id',
                name: 'valid_name',
                description: null,
                start_date: '2026-09-15',
                end_date: '2026-09-16',
                user_id: user.id,
            };
        }
    }

    const makeSut = () => {
        const transactionRepository = new TransactionRepositoryStub();
        const userRepository = new UserRepositoryStub();
        const eventRepository = new EventRepositoryStub();
        const sut = new GetTransactionByUserIdUseCase(
            transactionRepository,
            userRepository,
            eventRepository,
        );

        return {
            sut,
            transactionRepository,
            userRepository,
            eventRepository,
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
        const filters = { from, to };

        await sut.execute(id, filters);

        expect(spy).toHaveBeenCalledWith(id, filters);
    });

    it('should call transactionRepository.findByUserId without filters when none provided', async () => {
        const { sut, transactionRepository } = makeSut();
        const spy = jest.spyOn(transactionRepository, 'findByUserId');
        const id = faker.string.uuid();

        await sut.execute(id);

        expect(spy).toHaveBeenCalledWith(id, undefined);
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

    it('should throw EventNotFoundError if event does not exist', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce(null);
        const eventId = faker.string.uuid();

        const promise = sut.execute(user.id, { event_id: eventId });

        await expect(promise).rejects.toThrow(new EventNotFoundError(eventId));
    });

    it('should throw ForbiddenError if event belongs to another user', async () => {
        const { sut, eventRepository } = makeSut();
        const eventId = faker.string.uuid();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            id: eventId,
            name: 'Another user event',
            description: null,
            start_date: '2026-09-15',
            end_date: '2026-09-16',
            user_id: faker.string.uuid(),
        });

        const promise = sut.execute(user.id, { event_id: eventId });

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });

    it('should return transactions when event belongs to the user', async () => {
        const { sut, transactionRepository, eventRepository } = makeSut();
        const eventId = faker.string.uuid();
        const expectedTransactions: Transaction[] = [
            {
                id: faker.string.uuid(),
                user_id: user.id,
                name: 'Event Ticket',
                date: '2026-09-15',
                amount: '50',
                type: 'EXPENSE',
                event_id: eventId,
            },
        ];
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            id: eventId,
            name: 'My event',
            description: null,
            start_date: '2026-09-15',
            end_date: '2026-09-16',
            user_id: user.id,
        });
        jest.spyOn(transactionRepository, 'findByUserId').mockResolvedValueOnce(
            expectedTransactions,
        );

        const result = await sut.execute(user.id, { event_id: eventId });

        expect(result).toEqual(expectedTransactions);
    });

    it('should call eventRepository.findById with correct params when event_id filter provided', async () => {
        const { sut, eventRepository } = makeSut();
        const findByIdSpy = jest.spyOn(eventRepository, 'findById');
        const eventId = faker.string.uuid();

        await sut.execute(user.id, { event_id: eventId });

        expect(findByIdSpy).toHaveBeenCalledWith(eventId);
    });

    it('should not call eventRepository.findById when event_id filter is not provided', async () => {
        const { sut, eventRepository } = makeSut();
        const findByIdSpy = jest.spyOn(eventRepository, 'findById');

        await sut.execute(user.id, { from: '2026-01-01' });

        expect(findByIdSpy).not.toHaveBeenCalled();
    });

    it('should throw if eventRepository.findById throws', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(user.id, {
            event_id: faker.string.uuid(),
        });

        await expect(promise).rejects.toThrow();
    });
});

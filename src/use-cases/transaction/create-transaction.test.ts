import { UserNotFoundError } from '../../errors/user.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/auth.js';
import { transaction, user } from '../../tests/index.js';
import { CreateTransactionUseCase } from './create-transaction.js';
import {
    CreateTransactionParams,
    Event,
    EventRepository,
    Transaction,
    TransactionRepository,
    User,
    UserRepository,
} from '../../domain/index.js';

describe('Create Transaction Use Case', () => {
    const createTransactionParams: CreateTransactionParams = {
        ...transaction,
    };

    class TransactionRepositoryStub implements Pick<
        TransactionRepository,
        'create'
    > {
        async create(): Promise<Transaction> {
            return transaction;
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
        const sut = new CreateTransactionUseCase(
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

    it('should create transaction successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(createTransactionParams);

        expect(result).toEqual(transaction);
    });

    it('should call userRepository.findById with correct params', async () => {
        const { sut, userRepository } = makeSut();
        const findByIdSpy = jest.spyOn(userRepository, 'findById');

        await sut.execute(createTransactionParams);

        expect(findByIdSpy).toHaveBeenCalledWith(
            createTransactionParams.user_id,
        );
    });

    it('should call transactionRepository.create with correct params', async () => {
        const { sut, transactionRepository } = makeSut();
        const createSpy = jest.spyOn(transactionRepository, 'create');

        await sut.execute(createTransactionParams);

        expect(createSpy).toHaveBeenCalledWith(createTransactionParams);
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(createTransactionParams);

        await expect(promise).rejects.toThrow(
            new UserNotFoundError(createTransactionParams.user_id),
        );
    });

    it('should throw if userRepository.findById throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(createTransactionParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if transactionRepository.create throws', async () => {
        const { sut, transactionRepository } = makeSut();
        jest.spyOn(transactionRepository, 'create').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(createTransactionParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw EventNotFoundError if event does not exist', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute({
            ...createTransactionParams,
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

        const promise = sut.execute({
            ...createTransactionParams,
            event_id: 'event-id',
        });

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });
});

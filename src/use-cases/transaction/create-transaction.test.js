import { UserNotFoundError } from '../../errors/user';
import { EventNotFoundError } from '../../errors/event';
import { ForbiddenError } from '../../errors/auth';
import { transaction, user } from '../../tests';
import { CreateTransactionUseCase } from './create-transaction';

describe('Create Transaction Use Case', () => {
    const CreateTransactionParams = {
        ...transaction,
        id: undefined,
    };

    class TransactionRepositoryStub {
        async create() {
            return transaction;
        }
    }

    class UserRepositoryStub {
        async findById() {
            return user;
        }
    }

    class EventRepositoryStub {
        async findById() {
            return { id: 'valid_event_id', user_id: user.id };
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

        const result = await sut.execute(CreateTransactionParams);

        expect(result).toEqual(transaction);
    });

    it('should call userRepository.findById with correct params', async () => {
        const { sut, userRepository } = makeSut();
        const findByIdSpy = jest.spyOn(userRepository, 'findById');

        await sut.execute(CreateTransactionParams);

        expect(findByIdSpy).toHaveBeenCalledWith(
            CreateTransactionParams.user_id,
        );
    });

    it('should call transactionRepository.create with correct params', async () => {
        const { sut, transactionRepository } = makeSut();
        const createSpy = jest.spyOn(transactionRepository, 'create');

        await sut.execute(CreateTransactionParams);

        expect(createSpy).toHaveBeenCalledWith(CreateTransactionParams);
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(CreateTransactionParams);

        await expect(promise).rejects.toThrow(
            new UserNotFoundError(CreateTransactionParams.user_id),
        );
    });

    it('should throw if userRepository.findById throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(CreateTransactionParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if transactionRepository.create throws', async () => {
        const { sut, transactionRepository } = makeSut();
        jest.spyOn(transactionRepository, 'create').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(CreateTransactionParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw EventNotFoundError if event does not exist', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute({
            ...CreateTransactionParams,
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
            user_id: 'different-user-id',
        });

        const promise = sut.execute({
            ...CreateTransactionParams,
            event_id: 'event-id',
        });

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });
});

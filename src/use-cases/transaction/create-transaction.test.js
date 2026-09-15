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

    class CreateTransactionRepositoryStub {
        async execute() {
            return transaction;
        }
    }

    class IdGeneratorAdapterStub {
        execute() {
            return 'random_id';
        }
    }

    class GetUserByIdRepositoryStub {
        async execute() {
            return user;
        }
    }

    class GetEventByIdRepositoryStub {
        async execute() {
            return { id: 'valid_event_id', user_id: user.id };
        }
    }

    const makeSut = () => {
        const createTransactionRepository =
            new CreateTransactionRepositoryStub();
        const idGeneratorAdapter = new IdGeneratorAdapterStub();
        const getUserByIdRepository = new GetUserByIdRepositoryStub();
        const getEventByIdRepository = new GetEventByIdRepositoryStub();
        const sut = new CreateTransactionUseCase(
            createTransactionRepository,
            getUserByIdRepository,
            idGeneratorAdapter,
            getEventByIdRepository,
        );

        return {
            sut,
            createTransactionRepository,
            idGeneratorAdapter,
            getUserByIdRepository,
            getEventByIdRepository,
        };
    };

    it('should create transaction successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(CreateTransactionParams);

        expect(result).toEqual(transaction);
    });

    it('should call GetUserByIdRepository with correct params', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        const getUserByIdRepositorySpy = jest.spyOn(
            getUserByIdRepository,
            'execute',
        );

        await sut.execute(CreateTransactionParams);

        expect(getUserByIdRepositorySpy).toHaveBeenCalledWith(
            CreateTransactionParams.user_id,
        );
    });

    it('should call IdGeneratorAdapter', async () => {
        const { sut, idGeneratorAdapter } = makeSut();
        const idGeneratorAdapterSpy = jest.spyOn(idGeneratorAdapter, 'execute');

        await sut.execute(CreateTransactionParams);

        expect(idGeneratorAdapterSpy).toHaveBeenCalled();
    });

    it('should call createTransactionRepository with correct params', async () => {
        const { sut, createTransactionRepository } = makeSut();
        const createTransactionRepositorySpy = jest.spyOn(
            createTransactionRepository,
            'execute',
        );

        await sut.execute(CreateTransactionParams);

        expect(createTransactionRepositorySpy).toHaveBeenCalledWith({
            ...CreateTransactionParams,
            id: 'random_id',
        });
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockResolvedValueOnce(
            null,
        );

        const promise = sut.execute(CreateTransactionParams);

        await expect(promise).rejects.toThrow(
            new UserNotFoundError(CreateTransactionParams.user_id),
        );
    });

    it('should throw if GetUserByIdRepository throws', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(CreateTransactionParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if IdGeneratorAdapter throws', async () => {
        const { sut, idGeneratorAdapter } = makeSut();
        jest.spyOn(idGeneratorAdapter, 'execute').mockImplementationOnce(() => {
            throw new Error();
        });

        const promise = sut.execute(CreateTransactionParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if CreateTransactionRepository throws', async () => {
        const { sut, createTransactionRepository } = makeSut();
        jest.spyOn(
            createTransactionRepository,
            'execute',
        ).mockRejectedValueOnce(new Error());

        const promise = sut.execute(CreateTransactionParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw EventNotFoundError if event does not exist', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockResolvedValueOnce(
            null,
        );

        const promise = sut.execute({
            ...CreateTransactionParams,
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

        const promise = sut.execute({
            ...CreateTransactionParams,
            event_id: 'event-id',
        });

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });
});


import { UserNotFoundError } from '../../errors/user.js';
import { event, user } from '../../tests/index.js';
import { CreateEventUseCase } from './create-event.js';

describe('Create Event Use Case', () => {
    const createEventParams = {
        ...event,
        id: undefined,
    };

    class CreateEventRepositoryStub {
        async execute() {
            return event;
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

    const makeSut = () => {
        const createEventRepository = new CreateEventRepositoryStub();
        const idGeneratorAdapter = new IdGeneratorAdapterStub();
        const getUserByIdRepository = new GetUserByIdRepositoryStub();
        const sut = new CreateEventUseCase(
            createEventRepository,
            getUserByIdRepository,
            idGeneratorAdapter,
        );

        return {
            sut,
            createEventRepository,
            idGeneratorAdapter,
            getUserByIdRepository,
        };
    };

    it('should create event successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(createEventParams);

        expect(result).toEqual(event);
    });

    it('should call GetUserByIdRepository with correct params', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        const getUserByIdRepositorySpy = jest.spyOn(
            getUserByIdRepository,
            'execute',
        );

        await sut.execute(createEventParams);

        expect(getUserByIdRepositorySpy).toHaveBeenCalledWith(
            createEventParams.user_id,
        );
    });

    it('should call IdGeneratorAdapter', async () => {
        const { sut, idGeneratorAdapter } = makeSut();
        const idGeneratorAdapterSpy = jest.spyOn(idGeneratorAdapter, 'execute');

        await sut.execute(createEventParams);

        expect(idGeneratorAdapterSpy).toHaveBeenCalled();
    });

    it('should call CreateEventRepository with correct params', async () => {
        const { sut, createEventRepository } = makeSut();
        const createEventRepositorySpy = jest.spyOn(
            createEventRepository,
            'execute',
        );

        await sut.execute(createEventParams);

        expect(createEventRepositorySpy).toHaveBeenCalledWith({
            ...createEventParams,
            id: 'random_id',
        });
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockResolvedValueOnce(null);

        const promise = sut.execute(createEventParams);

        await expect(promise).rejects.toThrow(
            new UserNotFoundError(createEventParams.user_id),
        );
    });

    it('should throw if GetUserByIdRepository throws', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(createEventParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if IdGeneratorAdapter throws', async () => {
        const { sut, idGeneratorAdapter } = makeSut();
        jest.spyOn(idGeneratorAdapter, 'execute').mockImplementationOnce(() => {
            throw new Error();
        });

        const promise = sut.execute(createEventParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if CreateEventRepository throws', async () => {
        const { sut, createEventRepository } = makeSut();
        jest.spyOn(createEventRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(createEventParams);

        await expect(promise).rejects.toThrow();
    });
});

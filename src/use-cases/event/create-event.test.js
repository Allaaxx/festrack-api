import { UserNotFoundError } from '../../errors/user.js';
import { event, user } from '../../tests/index.js';
import { CreateEventUseCase } from './create-event.js';

describe('Create Event Use Case', () => {
    const createEventParams = {
        ...event,
        id: undefined,
    };

    class EventRepositoryStub {
        async create() {
            return event;
        }
    }

    class GetUserByIdRepositoryStub {
        async execute() {
            return user;
        }
    }

    const makeSut = () => {
        const eventRepository = new EventRepositoryStub();
        const getUserByIdRepository = new GetUserByIdRepositoryStub();
        const sut = new CreateEventUseCase(
            eventRepository,
            getUserByIdRepository,
        );

        return {
            sut,
            eventRepository,
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

    it('should call EventRepository.create with correct params', async () => {
        const { sut, eventRepository } = makeSut();
        const createSpy = jest.spyOn(eventRepository, 'create');

        await sut.execute(createEventParams);

        expect(createSpy).toHaveBeenCalledWith(createEventParams);
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockResolvedValueOnce(
            null,
        );

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

    it('should throw if EventRepository.create throws', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'create').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(createEventParams);

        await expect(promise).rejects.toThrow();
    });
});

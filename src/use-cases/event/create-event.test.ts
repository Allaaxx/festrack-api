import { UserNotFoundError } from '../../errors/user.js';
import { event, user } from '../../tests/index.js';
import { CreateEventUseCase } from './create-event.js';
import {
    Event,
    CreateEventParams,
    EventRepository,
    User,
    UserRepository,
} from '../../domain/index.js';

describe('Create Event Use Case', () => {
    const createEventParams: CreateEventParams = {
        name: event.name,
        description: event.description,
        user_id: event.user_id,
        start_date: event.start_date,
        end_date: event.end_date,
    };

    class EventRepositoryStub implements Pick<EventRepository, 'create'> {
        async create(_params: CreateEventParams): Promise<Event> {
            return event;
        }
    }

    class UserRepositoryStub implements Pick<UserRepository, 'findById'> {
        async findById(_id: string): Promise<User | null> {
            return user;
        }
    }

    const makeSut = () => {
        const eventRepository = new EventRepositoryStub();
        const userRepository = new UserRepositoryStub();
        const sut = new CreateEventUseCase(eventRepository, userRepository);

        return {
            sut,
            eventRepository,
            userRepository,
        };
    };

    it('should create event successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(createEventParams);

        expect(result).toEqual(event);
    });

    it('should call userRepository.findById with correct params', async () => {
        const { sut, userRepository } = makeSut();
        const findByIdSpy = jest.spyOn(userRepository, 'findById');

        await sut.execute(createEventParams);

        expect(findByIdSpy).toHaveBeenCalledWith(createEventParams.user_id);
    });

    it('should call EventRepository.create with correct params', async () => {
        const { sut, eventRepository } = makeSut();
        const createSpy = jest.spyOn(eventRepository, 'create');

        await sut.execute(createEventParams);

        expect(createSpy).toHaveBeenCalledWith(createEventParams);
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(createEventParams);

        await expect(promise).rejects.toThrow(
            new UserNotFoundError(createEventParams.user_id),
        );
    });

    it('should throw if userRepository.findById throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockRejectedValueOnce(
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

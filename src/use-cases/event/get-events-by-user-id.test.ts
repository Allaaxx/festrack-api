import { UserNotFoundError } from '../../errors/user.js';
import { event, user } from '../../tests/index.js';
import { GetEventsByUserIdUseCase } from './get-events-by-user-id.js';
import {
    Event,
    EventRepository,
    User,
    UserRepository,
} from '../../domain/index.js';

describe('Get Events By User Id Use Case', () => {
    class EventRepositoryStub
        implements Pick<EventRepository, 'findByUserId'>
    {
        async findByUserId(_userId: string): Promise<Event[]> {
            return [event];
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
        const sut = new GetEventsByUserIdUseCase(
            eventRepository,
            userRepository,
        );

        return {
            sut,
            eventRepository,
            userRepository,
        };
    };

    it('should get events by user id successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(user.id);

        expect(result).toEqual([event]);
    });

    it('should call userRepository.findById with correct params', async () => {
        const { sut, userRepository } = makeSut();
        const spy = jest.spyOn(userRepository, 'findById');

        await sut.execute(user.id);

        expect(spy).toHaveBeenCalledWith(user.id);
    });

    it('should call EventRepository.findByUserId with correct params', async () => {
        const { sut, eventRepository } = makeSut();
        const spy = jest.spyOn(eventRepository, 'findByUserId');

        await sut.execute(user.id);

        expect(spy).toHaveBeenCalledWith(user.id);
    });

    it('should throw UserNotFoundError if user is not found', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(user.id);

        await expect(promise).rejects.toThrow(new UserNotFoundError(user.id));
    });

    it('should throw if userRepository.findById throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(user.id);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if EventRepository.findByUserId throws', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findByUserId').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(user.id);

        await expect(promise).rejects.toThrow();
    });
});

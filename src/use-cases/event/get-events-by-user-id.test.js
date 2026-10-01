import { UserNotFoundError } from '../../errors/user.js';
import { event, user } from '../../tests/index.js';
import { GetEventsByUserIdUseCase } from './get-events-by-user-id.js';

describe('Get Events By User Id Use Case', () => {
    class EventRepositoryStub {
        async findByUserId() {
            return [event];
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
        const sut = new GetEventsByUserIdUseCase(
            eventRepository,
            getUserByIdRepository,
        );

        return {
            sut,
            eventRepository,
            getUserByIdRepository,
        };
    };

    it('should get events by user id successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(user.id);

        expect(result).toEqual([event]);
    });

    it('should call GetUserByIdRepository with correct params', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        const spy = jest.spyOn(getUserByIdRepository, 'execute');

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
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockResolvedValueOnce(
            null,
        );

        const promise = sut.execute(user.id);

        await expect(promise).rejects.toThrow(new UserNotFoundError(user.id));
    });

    it('should throw if GetUserByIdRepository throws', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockRejectedValueOnce(
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

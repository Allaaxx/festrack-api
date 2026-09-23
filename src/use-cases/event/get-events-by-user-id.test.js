import { UserNotFoundError } from '../../errors/user.js';
import { event, user } from '../../tests/index.js';
import { GetEventsByUserIdUseCase } from './get-events-by-user-id.js';

describe('Get Events By User Id Use Case', () => {
    class GetEventsByUserIdRepositoryStub {
        async execute() {
            return [event];
        }
    }

    class GetUserByIdRepositoryStub {
        async execute() {
            return user;
        }
    }

    const makeSut = () => {
        const getEventsByUserIdRepository =
            new GetEventsByUserIdRepositoryStub();
        const getUserByIdRepository = new GetUserByIdRepositoryStub();
        const sut = new GetEventsByUserIdUseCase(
            getEventsByUserIdRepository,
            getUserByIdRepository,
        );

        return {
            sut,
            getEventsByUserIdRepository,
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

    it('should call GetEventsByUserIdRepository with correct params', async () => {
        const { sut, getEventsByUserIdRepository } = makeSut();
        const spy = jest.spyOn(getEventsByUserIdRepository, 'execute');

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

    it('should throw if GetEventsByUserIdRepository throws', async () => {
        const { sut, getEventsByUserIdRepository } = makeSut();
        jest.spyOn(
            getEventsByUserIdRepository,
            'execute',
        ).mockRejectedValueOnce(new Error());

        const promise = sut.execute(user.id);

        await expect(promise).rejects.toThrow();
    });
});

import { UserNotFoundError } from '../../errors/user.js';
import { event, user } from '../../tests/index.js';
import { GetEventsByUserIdController } from './get-events-by-user-id.js';

describe('Get Events By User Id Controller', () => {
    class GetEventsByUserIdUseCaseStub {
        async execute() {
            return [event];
        }
    }

    const makeSut = () => {
        const getEventsByUserIdUseCase = new GetEventsByUserIdUseCaseStub();
        const sut = new GetEventsByUserIdController(getEventsByUserIdUseCase);

        return { sut, getEventsByUserIdUseCase };
    };

    it('should return 200 when getting events successfully', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            query: {
                userId: user.id,
            },
        });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual([event]);
    });

    it('should call GetEventsByUserIdUseCase with correct params', async () => {
        const { sut, getEventsByUserIdUseCase } = makeSut();
        const executeSpy = jest.spyOn(getEventsByUserIdUseCase, 'execute');

        await sut.execute({
            query: {
                userId: user.id,
            },
        });

        expect(executeSpy).toHaveBeenCalledWith(user.id);
    });

    it('should return 404 when user is not found', async () => {
        const { sut, getEventsByUserIdUseCase } = makeSut();
        jest.spyOn(getEventsByUserIdUseCase, 'execute').mockRejectedValueOnce(
            new UserNotFoundError(user.id),
        );

        const response = await sut.execute({
            query: {
                userId: user.id,
            },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 500 when use case throws', async () => {
        const { sut, getEventsByUserIdUseCase } = makeSut();
        jest.spyOn(getEventsByUserIdUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const response = await sut.execute({
            query: {
                userId: user.id,
            },
        });

        expect(response.statusCode).toBe(500);
    });
});

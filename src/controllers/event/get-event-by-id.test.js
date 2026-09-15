import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/auth.js';
import { event, user } from '../../tests/index.js';
import { GetEventByIdController } from './get-event-by-id.js';

describe('Get Event By Id Controller', () => {
    class GetEventByIdUseCaseStub {
        async execute() {
            return event;
        }
    }

    const makeSut = () => {
        const getEventByIdUseCase = new GetEventByIdUseCaseStub();
        const sut = new GetEventByIdController(getEventByIdUseCase);

        return { sut, getEventByIdUseCase };
    };

    const httpRequest = {
        params: {
            eventId: event.id,
        },
        userId: user.id,
    };

    it('should return 200 when getting event by id successfully', async () => {
        const { sut } = makeSut();

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(event);
    });

    it('should return 400 when eventId is not a valid UUID', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            params: { eventId: 'invalid-id' },
            userId: user.id,
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 404 when event is not found', async () => {
        const { sut, getEventByIdUseCase } = makeSut();
        jest.spyOn(getEventByIdUseCase, 'execute').mockRejectedValueOnce(
            new EventNotFoundError(event.id),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(404);
    });

    it('should return 403 when user is not the owner', async () => {
        const { sut, getEventByIdUseCase } = makeSut();
        jest.spyOn(getEventByIdUseCase, 'execute').mockRejectedValueOnce(
            new ForbiddenError(),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(403);
    });

    it('should return 500 when use case throws', async () => {
        const { sut, getEventByIdUseCase } = makeSut();
        jest.spyOn(getEventByIdUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(500);
    });

    it('should call GetEventByIdUseCase with correct params', async () => {
        const { sut, getEventByIdUseCase } = makeSut();
        const executeSpy = jest.spyOn(getEventByIdUseCase, 'execute');

        await sut.execute(httpRequest);

        expect(executeSpy).toHaveBeenCalledWith(event.id, user.id);
    });
});

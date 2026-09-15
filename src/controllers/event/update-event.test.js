import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/auth.js';
import { event, user } from '../../tests/index.js';
import { UpdateEventController } from './update-event.js';

describe('Update Event Controller', () => {
    class UpdateEventUseCaseStub {
        async execute() {
            return event;
        }
    }

    const makeSut = () => {
        const updateEventUseCase = new UpdateEventUseCaseStub();
        const sut = new UpdateEventController(updateEventUseCase);

        return { sut, updateEventUseCase };
    };

    const httpRequest = {
        params: {
            eventId: event.id,
        },
        body: {
            name: 'Updated Name',
        },
        userId: user.id,
    };

    it('should return 200 when updating event successfully', async () => {
        const { sut } = makeSut();

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(event);
    });

    it('should return 400 when eventId is not a valid UUID', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            ...httpRequest,
            params: { eventId: 'invalid-id' },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when body has invalid fields', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            ...httpRequest,
            body: {
                start_date: 'invalid-date',
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 404 when event is not found', async () => {
        const { sut, updateEventUseCase } = makeSut();
        jest.spyOn(updateEventUseCase, 'execute').mockRejectedValueOnce(
            new EventNotFoundError(event.id),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(404);
    });

    it('should return 403 when user is not the owner', async () => {
        const { sut, updateEventUseCase } = makeSut();
        jest.spyOn(updateEventUseCase, 'execute').mockRejectedValueOnce(
            new ForbiddenError(),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(403);
    });

    it('should return 500 when use case throws', async () => {
        const { sut, updateEventUseCase } = makeSut();
        jest.spyOn(updateEventUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(500);
    });

    it('should call UpdateEventUseCase with correct params', async () => {
        const { sut, updateEventUseCase } = makeSut();
        const executeSpy = jest.spyOn(updateEventUseCase, 'execute');

        await sut.execute(httpRequest);

        expect(executeSpy).toHaveBeenCalledWith(
            event.id,
            user.id,
            httpRequest.body,
        );
    });
});

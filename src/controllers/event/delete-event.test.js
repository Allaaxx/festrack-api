import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/auth.js';
import { event, user } from '../../tests/index.js';
import { DeleteEventController } from './delete-event.js';

describe('Delete Event Controller', () => {
    class DeleteEventUseCaseStub {
        async execute() {
            return event;
        }
    }

    const makeSut = () => {
        const deleteEventUseCase = new DeleteEventUseCaseStub();
        const sut = new DeleteEventController(deleteEventUseCase);

        return { sut, deleteEventUseCase };
    };

    const httpRequest = {
        params: {
            eventId: event.id,
        },
        userId: user.id,
    };

    it('should return 200 and deleted event when deleting successfully', async () => {
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
        const { sut, deleteEventUseCase } = makeSut();
        jest.spyOn(deleteEventUseCase, 'execute').mockRejectedValueOnce(
            new EventNotFoundError(event.id),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(404);
    });

    it('should return 403 when user is not the owner', async () => {
        const { sut, deleteEventUseCase } = makeSut();
        jest.spyOn(deleteEventUseCase, 'execute').mockRejectedValueOnce(
            new ForbiddenError(),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(403);
    });

    it('should return 500 when use case throws', async () => {
        const { sut, deleteEventUseCase } = makeSut();
        jest.spyOn(deleteEventUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(500);
    });

    it('should call DeleteEventUseCase with correct params', async () => {
        const { sut, deleteEventUseCase } = makeSut();
        const executeSpy = jest.spyOn(deleteEventUseCase, 'execute');

        await sut.execute(httpRequest);

        expect(executeSpy).toHaveBeenCalledWith(event.id, user.id);
    });
});

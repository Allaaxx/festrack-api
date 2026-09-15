import { UserNotFoundError } from '../../errors/user.js';
import { event } from '../../tests/index.js';
import { CreateEventController } from './create-event.js';

describe('Create Event Controller', () => {
    class CreateEventUseCaseStub {
        async execute() {
            return event;
        }
    }

    const makeSut = () => {
        const createEventUseCase = new CreateEventUseCaseStub();
        const sut = new CreateEventController(createEventUseCase);

        return {
            sut,
            createEventUseCase,
        };
    };

    const baseHttpRequest = {
        body: {
            ...event,
            id: undefined,
        },
    };

    it('should return 201 when creating event successfully', async () => {
        const { sut } = makeSut();

        const response = await sut.execute(baseHttpRequest);

        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual(event);
    });

    it('should return 400 when missing user_id', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            body: {
                ...baseHttpRequest.body,
                user_id: undefined,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when missing name', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            body: {
                ...baseHttpRequest.body,
                name: undefined,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when missing start_date', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            body: {
                ...baseHttpRequest.body,
                start_date: undefined,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when missing end_date', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            body: {
                ...baseHttpRequest.body,
                end_date: undefined,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when date is invalid', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            body: {
                ...baseHttpRequest.body,
                start_date: 'invalid_date',
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when end_date is before start_date', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            body: {
                ...baseHttpRequest.body,
                start_date: '2026-09-20T00:00:00.000Z',
                end_date: '2026-09-10T00:00:00.000Z',
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 404 when user_id is not found', async () => {
        const { sut, createEventUseCase } = makeSut();
        jest.spyOn(createEventUseCase, 'execute').mockRejectedValueOnce(
            new UserNotFoundError('any_user_id'),
        );

        const response = await sut.execute(baseHttpRequest);

        expect(response.statusCode).toBe(404);
    });

    it('should return 500 when CreateEventUseCase throws', async () => {
        const { sut, createEventUseCase } = makeSut();
        jest.spyOn(createEventUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const response = await sut.execute(baseHttpRequest);

        expect(response.statusCode).toBe(500);
    });

    it('should call CreateEventUseCase with correct values', async () => {
        const { sut, createEventUseCase } = makeSut();
        const executeSpy = jest.spyOn(createEventUseCase, 'execute');

        await sut.execute(baseHttpRequest);

        expect(executeSpy).toHaveBeenCalledWith(baseHttpRequest.body);
    });
});

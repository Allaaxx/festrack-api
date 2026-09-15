import { Router } from 'express';
import {
    makeCreateEventController,
    makeDeleteEventController,
    makeGetEventByIdController,
    makeGetEventsByUserIdController,
    makeUpdateEventController,
} from '../factories/controllers/event.js';
import { auth } from '../middlewares/auth.js';

export const eventsRouter = Router();

eventsRouter.post('/', auth, async (request, response) => {
    const controller = makeCreateEventController();

    const { statusCode, body } = await controller.execute({
        ...request,
        body: {
            ...request.body,
            user_id: request.userId,
        },
    });

    response.status(statusCode).send(body);
});

eventsRouter.get('/', auth, async (request, response) => {
    const controller = makeGetEventsByUserIdController();

    const { statusCode, body } = await controller.execute({
        ...request,
        query: {
            ...request.query,
            userId: request.userId,
        },
    });

    response.status(statusCode).send(body);
});

eventsRouter.get('/:eventId', auth, async (request, response) => {
    const controller = makeGetEventByIdController();

    const { statusCode, body } = await controller.execute({
        ...request,
        params: {
            ...request.params,
        },
        userId: request.userId,
    });

    response.status(statusCode).send(body);
});

eventsRouter.patch('/:eventId', auth, async (request, response) => {
    const controller = makeUpdateEventController();

    const { statusCode, body } = await controller.execute({
        ...request,
        params: {
            ...request.params,
        },
        userId: request.userId,
    });

    response.status(statusCode).send(body);
});

eventsRouter.put('/:eventId', auth, async (request, response) => {
    const controller = makeUpdateEventController();

    const { statusCode, body } = await controller.execute({
        ...request,
        params: {
            ...request.params,
        },
        userId: request.userId,
    });

    response.status(statusCode).send(body);
});

eventsRouter.delete('/:eventId', auth, async (request, response) => {
    const controller = makeDeleteEventController();

    const { statusCode, body } = await controller.execute({
        ...request,
        params: {
            ...request.params,
        },
        userId: request.userId,
    });

    response.status(statusCode).send(body);
});

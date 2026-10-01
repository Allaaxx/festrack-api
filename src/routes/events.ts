import { Router, Request, Response } from 'express';
import {
    makeCreateEventController,
    makeDeleteEventController,
    makeGetEventByIdController,
    makeGetEventsByUserIdController,
    makeUpdateEventController,
} from '../factories/controllers/event.js';
import { auth } from '../middlewares/auth.js';

export const eventsRouter = Router();

eventsRouter.post('/me', auth, async (request: Request, response: Response) => {
    const controller = makeCreateEventController();

    const { statusCode, body } = await controller.execute({
        body: {
            ...request.body,
            user_id: request.userId!,
        },
        headers: request.headers,
        userId: request.userId,
    });

    response.status(statusCode).send(body);
});

eventsRouter.get('/me', auth, async (request: Request, response: Response) => {
    const controller = makeGetEventsByUserIdController();

    const { statusCode, body } = await controller.execute({
        query: {
            ...request.query,
            userId: request.userId!,
        },
        headers: request.headers,
        userId: request.userId,
    });

    response.status(statusCode).send(body);
});

eventsRouter.get(
    '/me/:eventId',
    auth,
    async (request: Request<{ eventId: string }>, response: Response) => {
        const controller = makeGetEventByIdController();

        const { statusCode, body } = await controller.execute({
            params: {
                eventId: request.params.eventId,
            },
            headers: request.headers,
            userId: request.userId,
        });

        response.status(statusCode).send(body);
    },
);

eventsRouter.patch(
    '/me/:eventId',
    auth,
    async (request: Request<{ eventId: string }>, response: Response) => {
        const controller = makeUpdateEventController();

        const { statusCode, body } = await controller.execute({
            body: request.body,
            params: {
                eventId: request.params.eventId,
            },
            headers: request.headers,
            userId: request.userId,
        });

        response.status(statusCode).send(body);
    },
);

eventsRouter.delete(
    '/me/:eventId',
    auth,
    async (request: Request<{ eventId: string }>, response: Response) => {
        const controller = makeDeleteEventController();

        const { statusCode, body } = await controller.execute({
            params: {
                eventId: request.params.eventId,
            },
            headers: request.headers,
            userId: request.userId,
        });

        response.status(statusCode).send(body);
    },
);

import { Router } from 'express';
import { makeCreateEventController } from '../factories/controllers/event.js';
import { auth } from '../middlewares/auth.js';

export const eventsRouter = Router();

eventsRouter.post('/', auth, async (request, response) => {
    const createEventController = makeCreateEventController();

    const { statusCode, body } = await createEventController.execute({
        ...request,
        body: {
            ...request.body,
            user_id: request.userId,
        },
    });

    response.status(statusCode).send(body);
});

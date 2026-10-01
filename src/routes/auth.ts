import { Router, Request, Response } from 'express';
import {
    makeCreateUserController,
    makeLoginUserController,
    makeRefreshTokenController,
} from '../factories/controllers/auth.js';

export const authRouter = Router();

authRouter.post('/', async (request: Request, response: Response) => {
    const createUserController = makeCreateUserController();

    const { statusCode, body } = await createUserController.execute({
        body: request.body,
    });

    response.status(statusCode).send(body);
});

authRouter.post('/login', async (request: Request, response: Response) => {
    const loginController = makeLoginUserController();

    const { statusCode, body } = await loginController.execute({
        body: request.body,
    });

    response.status(statusCode).send(body);
});

authRouter.post(
    '/refresh-token',
    async (request: Request, response: Response) => {
        const refreshTokenController = makeRefreshTokenController();

        const { statusCode, body } = await refreshTokenController.execute({
            body: request.body,
        });

        response.status(statusCode).send(body);
    },
);

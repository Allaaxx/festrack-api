import { Router } from 'express';
import {
    makeLoginUserController,
    makeRefreshTokenController,
} from '../factories/controllers/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (request, response) => {
    const loginController = makeLoginUserController();

    const { statusCode, body } = await loginController.execute(request);

    response.status(statusCode).send(body);
});

authRouter.post('/refresh-token', async (request, response) => {
    const refreshTokenController = makeRefreshTokenController();

    const { statusCode, body } = await refreshTokenController.execute(request);

    response.status(statusCode).send(body);
});

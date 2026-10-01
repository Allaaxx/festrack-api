import { Router, Request, Response } from 'express';
import {
    makeDeleteUserController,
    makeGetUserBalanceController,
    makeGetUserByIdController,
    makeUpdateUserController,
} from '../factories/controllers/user.js';
import { auth } from '../middlewares/auth.js';

export const usersRouter = Router();

usersRouter.get('/me', auth, async (request: Request, response: Response) => {
    const getUserByIdController = makeGetUserByIdController();

    const { statusCode, body } = await getUserByIdController.execute({
        ...request,
        params: {
            userId: request.userId,
        },
    });

    response.status(statusCode).send(body);
});

usersRouter.get('/me/balance', auth, async (request: Request, response: Response) => {
    const getUserBalanceController = makeGetUserBalanceController();

    const { statusCode, body } = await getUserBalanceController.execute({
        ...request,
        params: {
            userId: request.userId,
        },
        query: {
            from: request.query.from,
            to: request.query.to,
        },
    });

    response.status(statusCode).send(body);
});

usersRouter.patch('/me', auth, async (request: Request, response: Response) => {
    const updateUserController = makeUpdateUserController();

    const { statusCode, body } = await updateUserController.execute({
        ...request,
        params: {
            userId: request.userId,
        },
    });

    response.status(statusCode).send(body);
});

usersRouter.delete('/me', auth, async (request: Request, response: Response) => {
    const deleteUserController = makeDeleteUserController();

    const { statusCode, body } = await deleteUserController.execute({
        ...request,
        params: {
            userId: request.userId,
        },
    });
    response.status(statusCode).send(body);
});

import { Router, Request, Response } from 'express';
import {
    makeCreateTransactionController,
    makeDeleteTransactionController,
    makeGetTransactionsByUserIdController,
    makeUpdateTransactionController,
} from '../factories/controllers/transaction.js';
import { auth } from '../middlewares/auth.js';

export const transactionsRouter = Router();

transactionsRouter.get(
    '/me',
    auth,
    async (request: Request, response: Response) => {
        const getTransactionsByUserIdController =
            makeGetTransactionsByUserIdController();

        const { statusCode, body } =
            await getTransactionsByUserIdController.execute({
                ...request,
                query: {
                    ...request.query,
                    from: request.query.from as string,
                    to: request.query.to as string,
                    userId: request.userId!,
                },
            });

        response.status(statusCode).send(body);
    },
);

transactionsRouter.post(
    '/me',
    auth,
    async (request: Request, response: Response) => {
        const createTransactionController = makeCreateTransactionController();

        const { statusCode, body } = await createTransactionController.execute({
            ...request,
            body: {
                ...request.body,
                user_id: request.userId!,
            },
        });

        response.status(statusCode).send(body);
    },
);

transactionsRouter.patch(
    '/me/:transactionId',
    auth,
    async (request: Request<{ transactionId: string }>, response: Response) => {
        const updateTransactionController = makeUpdateTransactionController();

        const { statusCode, body } = await updateTransactionController.execute({
            ...request,
            body: {
                ...request.body,
            },
        });

        response.status(statusCode).send(body);
    },
);

transactionsRouter.delete(
    '/me/:transactionId',
    auth,
    async (request: Request<{ transactionId: string }>, response: Response) => {
        const deleteTransactionController = makeDeleteTransactionController();

        const { statusCode, body } = await deleteTransactionController.execute({
            ...request,
            params: {
                ...request.params,
                user_id: request.userId!,
            },
        });

        response.status(statusCode).send(body);
    },
);

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
                query: {
                    from: request.query.from as string,
                    to: request.query.to as string,
                    userId: request.userId!,
                },
                headers: request.headers,
                userId: request.userId,
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
            body: {
                ...request.body,
                user_id: request.userId!,
            },
            headers: request.headers,
            userId: request.userId,
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
            body: request.body,
            params: {
                transactionId: request.params.transactionId,
            },
            headers: request.headers,
            userId: request.userId,
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
            params: {
                transactionId: request.params.transactionId,
                user_id: request.userId!,
            },
            headers: request.headers,
            userId: request.userId,
        });

        response.status(statusCode).send(body);
    },
);

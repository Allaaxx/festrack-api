import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    CreateTransactionUseCase,
    GetTransactionByUserIdUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
} from '../../use-cases/index.js';
import {
    PostgresEventRepository,
    PostgresTransactionRepository,
    PostgresUserRepository,
} from '../../repositories/postgres/index.js';
import {
    EventNotFoundError,
    ForbiddenError,
    TransactionNotFoundError,
    UserNotFoundError,
} from '../../errors/index.js';

const isIsoDateValid = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
};

export const transactionsRoutes = new Elysia({ prefix: '/api/transactions' })
    .use(authPlugin)
    .post(
        '/me',
        async ({ userId, body, set }) => {
            if (body.name.trim().length === 0) {
                set.status = 400;
                return { message: 'Name is required.' };
            }
            if (!isIsoDateValid(body.date)) {
                set.status = 400;
                return { message: 'Date must be a valid date.' };
            }
            if (body.amount <= 0) {
                set.status = 400;
                return { message: 'Amount must be greater than 0.' };
            }

            const transactionRepository = new PostgresTransactionRepository();
            const userRepository = new PostgresUserRepository();
            const eventRepository = new PostgresEventRepository();
            const useCase = new CreateTransactionUseCase(
                transactionRepository,
                userRepository,
                eventRepository,
            );

            try {
                const transaction = await useCase.execute({
                    ...body,
                    user_id: userId!,
                });
                set.status = 201;
                return transaction;
            } catch (error) {
                if (error instanceof UserNotFoundError) {
                    set.status = 404;
                    return { message: 'User not found.' };
                }
                if (error instanceof EventNotFoundError) {
                    set.status = 404;
                    return { message: 'Event not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: 'Forbidden' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            body: t.Object(
                {
                    user_id: t.Optional(t.String()),
                    name: t.String({
                        minLength: 1,
                        error: 'Name is required.',
                    }),
                    date: t.String({
                        minLength: 1,
                        error: 'Date is required.',
                    }),
                    type: t.Union(
                        [
                            t.Literal('EXPENSE'),
                            t.Literal('EARNING'),
                            t.Literal('INVESTMENT'),
                        ],
                        {
                            error: 'Type must be EXPENSE, EARNING or INVESTMENT.',
                        },
                    ),
                    amount: t.Number({
                        error: 'Amount must be a number.',
                    }),
                    event_id: t.Optional(
                        t.Nullable(
                            t.String({
                                format: 'uuid',
                                error: 'Event ID must be a valid UUID.',
                            }),
                        ),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Transactions'],
                summary: 'Create a new transaction',
            },
        },
    )
    .get(
        '/me',
        async ({ userId, query, set }) => {
            const transactionRepository = new PostgresTransactionRepository();
            const userRepository = new PostgresUserRepository();
            const useCase = new GetTransactionByUserIdUseCase(
                transactionRepository,
                userRepository,
            );

            try {
                const transactions = await useCase.execute(
                    userId!,
                    query?.from,
                    query?.to,
                );
                set.status = 200;
                return transactions;
            } catch (error) {
                if (error instanceof UserNotFoundError) {
                    set.status = 404;
                    return { message: 'User not found.' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            query: t.Object({
                from: t.Optional(t.String()),
                to: t.Optional(t.String()),
            }),
            detail: {
                tags: ['Transactions'],
                summary: 'Get all user transactions',
            },
        },
    )
    .patch(
        '/me/:transactionId',
        async ({ userId, params, body, set }) => {
            if (body.name !== undefined && body.name.trim().length === 0) {
                set.status = 400;
                return { message: 'Name is required.' };
            }
            if (body.date !== undefined && !isIsoDateValid(body.date)) {
                set.status = 400;
                return { message: 'Date must be a valid date.' };
            }
            if (body.amount !== undefined && body.amount <= 0) {
                set.status = 400;
                return { message: 'Amount must be greater than 0.' };
            }

            const transactionRepository = new PostgresTransactionRepository();
            const eventRepository = new PostgresEventRepository();
            const useCase = new UpdateTransactionUseCase(
                transactionRepository,
                eventRepository,
            );

            try {
                const transaction = await useCase.execute(
                    params.transactionId,
                    {
                        ...body,
                        user_id: userId!,
                    },
                );
                set.status = 200;
                return transaction;
            } catch (error) {
                if (error instanceof TransactionNotFoundError) {
                    set.status = 404;
                    return { message: 'Transaction not found.' };
                }
                if (error instanceof EventNotFoundError) {
                    set.status = 404;
                    return { message: 'Event not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: 'Forbidden' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object({
                transactionId: t.String({
                    format: 'uuid',
                    error: 'The provided id is not valid.',
                }),
            }),
            body: t.Object(
                {
                    name: t.Optional(
                        t.String({
                            minLength: 1,
                            error: 'Name is required.',
                        }),
                    ),
                    date: t.Optional(t.String()),
                    type: t.Optional(
                        t.Union(
                            [
                                t.Literal('EXPENSE'),
                                t.Literal('EARNING'),
                                t.Literal('INVESTMENT'),
                            ],
                            {
                                error: 'Type must be EXPENSE, EARNING or INVESTMENT.',
                            },
                        ),
                    ),
                    amount: t.Optional(
                        t.Number({
                            error: 'Amount must be a number.',
                        }),
                    ),
                    event_id: t.Optional(
                        t.Nullable(
                            t.String({
                                format: 'uuid',
                                error: 'Event ID must be a valid UUID.',
                            }),
                        ),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Transactions'],
                summary: 'Update transaction by id',
            },
        },
    )
    .delete(
        '/me/:transactionId',
        async ({ userId, params, set }) => {
            const transactionRepository = new PostgresTransactionRepository();
            const useCase = new DeleteTransactionUseCase(transactionRepository);

            try {
                const transaction = await useCase.execute(
                    params.transactionId,
                    userId!,
                );
                set.status = 200;
                return transaction;
            } catch (error) {
                if (error instanceof TransactionNotFoundError) {
                    set.status = 404;
                    return { message: 'Transaction not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: 'Forbidden' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object({
                transactionId: t.String({
                    format: 'uuid',
                    error: 'The provided id is not valid.',
                }),
            }),
            detail: {
                tags: ['Transactions'],
                summary: 'Delete transaction by id',
            },
        },
    );

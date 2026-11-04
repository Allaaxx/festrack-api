import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    CreateTransactionUseCase,
    GetTransactionsByShopIdUseCase,
    GetTransactionByIdUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
} from '../use-cases/index.js';
import {
    PostgresEventRepository,
    PostgresShopMemberRepository,
    PostgresShopRepository,
    PostgresTransactionRepository,
} from '../repositories/postgres/index.js';
import {
    EventNotFoundError,
    ForbiddenError,
    ShopNotFoundError,
    TransactionNotFoundError,
} from '../errors/index.js';
import { isIsoDateValid } from './helpers.js';

export const transactionsRoutes = new Elysia({
    prefix: '/api/shops/:shopId/transactions',
})
    .use(authPlugin)
    .post(
        '',
        async ({ userId, params, body, set }) => {
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
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const eventRepository = new PostgresEventRepository();

            const useCase = new CreateTransactionUseCase(
                transactionRepository,
                shopRepository,
                shopMemberRepository,
                eventRepository,
            );

            try {
                const transaction = await useCase.execute({
                    shopId: params.shopId,
                    userId: userId!,
                    name: body.name,
                    date: body.date,
                    amount: body.amount,
                    type: body.type,
                    event_id: body.event_id ?? null,
                });
                set.status = 201;
                return transaction;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
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
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            body: t.Object(
                {
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
                summary: 'Create a new transaction in shop',
            },
        },
    )
    .get(
        '',
        async ({ userId, params, query, set }) => {
            const transactionRepository = new PostgresTransactionRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const eventRepository = new PostgresEventRepository();

            const useCase = new GetTransactionsByShopIdUseCase(
                transactionRepository,
                shopRepository,
                shopMemberRepository,
                eventRepository,
            );

            try {
                const transactions = await useCase.execute(
                    params.shopId,
                    userId!,
                    query
                        ? {
                              from: query.from,
                              to: query.to,
                              event_id: query.event_id,
                          }
                        : undefined,
                );
                set.status = 200;
                return transactions;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
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
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            query: t.Object(
                {
                    from: t.Optional(t.String()),
                    to: t.Optional(t.String()),
                    event_id: t.Optional(
                        t.String({
                            format: 'uuid',
                            error: 'Event ID must be a valid UUID.',
                        }),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Transactions'],
                summary: 'Get all shop transactions',
                description:
                    'Retrieve transactions for a shop, optionally filtered by date range or associated event.',
            },
        },
    )
    .get(
        '/:id',
        async ({ userId, params, set }) => {
            const transactionRepository = new PostgresTransactionRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new GetTransactionByIdUseCase(
                transactionRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const transaction = await useCase.execute(
                    params.shopId,
                    params.id,
                    userId!,
                );
                set.status = 200;
                return transaction;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
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
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                    id: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Transactions'],
                summary: 'Get shop transaction by id',
            },
        },
    )
    .patch(
        '/:id',
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
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const eventRepository = new PostgresEventRepository();

            const useCase = new UpdateTransactionUseCase(
                transactionRepository,
                shopRepository,
                shopMemberRepository,
                eventRepository,
            );

            try {
                const transaction = await useCase.execute(
                    params.shopId,
                    params.id,
                    userId!,
                    body,
                );
                set.status = 200;
                return transaction;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
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
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                    id: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
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
                summary: 'Update shop transaction by id',
            },
        },
    )
    .delete(
        '/:id',
        async ({ userId, params, set }) => {
            const transactionRepository = new PostgresTransactionRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new DeleteTransactionUseCase(
                transactionRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const transaction = await useCase.execute(
                    params.shopId,
                    params.id,
                    userId!,
                );
                set.status = 200;
                return transaction;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
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
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                    id: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Transactions'],
                summary: 'Delete shop transaction by id',
            },
        },
    );

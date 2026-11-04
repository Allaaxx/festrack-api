import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    CreateEventUseCase,
    GetEventsByShopIdUseCase,
    GetEventByIdUseCase,
    UpdateEventUseCase,
    DeleteEventUseCase,
} from '../use-cases/index.js';
import {
    PostgresEventRepository,
    PostgresShopRepository,
    PostgresShopMemberRepository,
    PostgresUserRepository,
} from '../repositories/postgres/index.js';
import { DefaultGoogleCalendarAdapter } from '../adapters/index.js';
import { EventNotFoundError } from '../errors/event.js';
import { ShopNotFoundError } from '../errors/shop.js';
import { ForbiddenError } from '../errors/index.js';
import { isIsoDateValid } from './helpers.js';

export const eventsRoutes = new Elysia({ prefix: '/api/shops/:shopId/events' })
    .use(authPlugin)
    .post(
        '',
        async ({ userId, params, body, set }) => {
            if (!isIsoDateValid(body.start_date)) {
                set.status = 400;
                return { message: 'Start date must be a valid date.' };
            }
            if (!isIsoDateValid(body.end_date)) {
                set.status = 400;
                return { message: 'End date must be a valid date.' };
            }
            if (new Date(body.end_date) < new Date(body.start_date)) {
                set.status = 400;
                return {
                    message:
                        'End date must be greater than or equal to start date.',
                };
            }

            const eventRepository = new PostgresEventRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const userRepository = new PostgresUserRepository();
            const calendarAdapter = new DefaultGoogleCalendarAdapter();

            const useCase = new CreateEventUseCase(
                eventRepository,
                shopRepository,
                shopMemberRepository,
                userRepository,
                calendarAdapter,
            );

            try {
                const event = await useCase.execute({
                    shopId: params.shopId,
                    userId: userId!,
                    name: body.name,
                    description: body.description ?? null,
                    start_date: body.start_date,
                    end_date: body.end_date,
                });
                set.status = 201;
                return event;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
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
                        maxLength: 50,
                        error: 'Name is required.',
                    }),
                    description: t.Optional(
                        t.Nullable(
                            t.String({
                                maxLength: 200,
                                error: 'Description must be at most 200 characters.',
                            }),
                        ),
                    ),
                    start_date: t.String({
                        minLength: 1,
                        error: 'Start date is required.',
                    }),
                    end_date: t.String({
                        minLength: 1,
                        error: 'End date is required.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Events'],
                summary: 'Create a new shop event',
            },
        },
    )
    .get(
        '',
        async ({ userId, params, set }) => {
            const eventRepository = new PostgresEventRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new GetEventsByShopIdUseCase(
                eventRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const events = await useCase.execute(params.shopId, userId!);
                set.status = 200;
                return events;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
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
            detail: {
                tags: ['Events'],
                summary: 'Get all shop events',
            },
        },
    )
    .get(
        '/:id',
        async ({ userId, params, set }) => {
            const eventRepository = new PostgresEventRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new GetEventByIdUseCase(
                eventRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const event = await useCase.execute(
                    params.shopId,
                    params.id,
                    userId!,
                );
                set.status = 200;
                return event;
            } catch (error) {
                if (error instanceof EventNotFoundError) {
                    set.status = 404;
                    return { message: 'Event not found.' };
                }
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
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
                tags: ['Events'],
                summary: 'Get shop event by id',
            },
        },
    )
    .patch(
        '/:id',
        async ({ userId, params, body, set }) => {
            if (body.start_date && !isIsoDateValid(body.start_date)) {
                set.status = 400;
                return { message: 'Start date must be a valid date.' };
            }
            if (body.end_date && !isIsoDateValid(body.end_date)) {
                set.status = 400;
                return { message: 'End date must be a valid date.' };
            }
            if (body.start_date && body.end_date) {
                if (new Date(body.end_date) < new Date(body.start_date)) {
                    set.status = 400;
                    return {
                        message:
                            'End date must be greater than or equal to start date.',
                    };
                }
            }

            const eventRepository = new PostgresEventRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const userRepository = new PostgresUserRepository();
            const calendarAdapter = new DefaultGoogleCalendarAdapter();

            const useCase = new UpdateEventUseCase(
                eventRepository,
                shopRepository,
                shopMemberRepository,
                userRepository,
                calendarAdapter,
            );

            try {
                const event = await useCase.execute(
                    params.shopId,
                    params.id,
                    userId!,
                    body,
                );
                set.status = 200;
                return event;
            } catch (error) {
                if (error instanceof EventNotFoundError) {
                    set.status = 404;
                    return { message: 'Event not found.' };
                }
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
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
                            maxLength: 50,
                            error: 'Name is required.',
                        }),
                    ),
                    description: t.Optional(
                        t.Nullable(
                            t.String({
                                maxLength: 200,
                                error: 'Description must be at most 200 characters.',
                            }),
                        ),
                    ),
                    start_date: t.Optional(t.String()),
                    end_date: t.Optional(t.String()),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Events'],
                summary: 'Update shop event by id',
            },
        },
    )
    .delete(
        '/:id',
        async ({ userId, params, set }) => {
            const eventRepository = new PostgresEventRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const userRepository = new PostgresUserRepository();
            const calendarAdapter = new DefaultGoogleCalendarAdapter();

            const useCase = new DeleteEventUseCase(
                eventRepository,
                shopRepository,
                shopMemberRepository,
                userRepository,
                calendarAdapter,
            );

            try {
                const event = await useCase.execute(
                    params.shopId,
                    params.id,
                    userId!,
                );
                set.status = 200;
                return event;
            } catch (error) {
                if (error instanceof EventNotFoundError) {
                    set.status = 404;
                    return { message: 'Event not found.' };
                }
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
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
                tags: ['Events'],
                summary: 'Delete shop event by id',
            },
        },
    );

import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    CreateEventUseCase,
    GetEventsByUserIdUseCase,
    GetEventByIdUseCase,
    UpdateEventUseCase,
    DeleteEventUseCase,
} from '../../use-cases/index.js';
import {
    PostgresEventRepository,
    PostgresUserRepository,
} from '../../repositories/postgres/index.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';

const isIsoDateValid = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
};

export const eventsRoutes = new Elysia({ prefix: '/api/events' })
    .use(authPlugin)
    .post(
        '/me',
        async ({ userId, body, set }) => {
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
            const userRepository = new PostgresUserRepository();
            const useCase = new CreateEventUseCase(
                eventRepository,
                userRepository,
            );

            try {
                const event = await useCase.execute({
                    ...body,
                    user_id: userId!,
                });
                set.status = 201;
                return event;
            } catch {
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
                summary: 'Create a new event',
            },
        },
    )
    .get(
        '/me',
        async ({ userId, set }) => {
            const eventRepository = new PostgresEventRepository();
            const userRepository = new PostgresUserRepository();
            const useCase = new GetEventsByUserIdUseCase(
                eventRepository,
                userRepository,
            );

            try {
                const events = await useCase.execute(userId!);
                set.status = 200;
                return events;
            } catch {
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            detail: {
                tags: ['Events'],
                summary: 'Get all user events',
            },
        },
    )
    .get(
        '/me/:eventId',
        async ({ userId, params, set }) => {
            const repository = new PostgresEventRepository();
            const useCase = new GetEventByIdUseCase(repository);

            try {
                const event = await useCase.execute(params.eventId, userId!);
                set.status = 200;
                return event;
            } catch (error) {
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
                eventId: t.String({
                    format: 'uuid',
                    error: 'The provided id is not valid.',
                }),
            }),
            detail: {
                tags: ['Events'],
                summary: 'Get event by id',
            },
        },
    )
    .patch(
        '/me/:eventId',
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

            const repository = new PostgresEventRepository();
            const useCase = new UpdateEventUseCase(repository);

            try {
                const event = await useCase.execute(
                    params.eventId,
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
                eventId: t.String({
                    format: 'uuid',
                    error: 'The provided id is not valid.',
                }),
            }),
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
                summary: 'Update event by id',
            },
        },
    )
    .delete(
        '/me/:eventId',
        async ({ userId, params, set }) => {
            const repository = new PostgresEventRepository();
            const useCase = new DeleteEventUseCase(repository);

            try {
                const event = await useCase.execute(params.eventId, userId!);
                set.status = 200;
                return event;
            } catch (error) {
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
                eventId: t.String({
                    format: 'uuid',
                    error: 'The provided id is not valid.',
                }),
            }),
            detail: {
                tags: ['Events'],
                summary: 'Delete event by id',
            },
        },
    );

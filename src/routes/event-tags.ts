import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    GetEventTagsByShopIdUseCase,
    CreateEventTagUseCase,
    DeleteEventTagUseCase,
} from '../use-cases/index.js';
import {
    PostgresEventTagRepository,
    PostgresEventRepository,
    PostgresShopRepository,
    PostgresShopMemberRepository,
} from '../repositories/postgres/index.js';
import { ShopNotFoundError } from '../errors/shop.js';
import { ForbiddenError } from '../errors/auth.js';
import {
    EventTagConflictError,
    InvalidEventTagSlugError,
    EventTagNotFoundError,
} from '../errors/event-tag.js';

export const eventTagsRoutes = new Elysia({
    prefix: '/api/shops/:shopId/event-tags',
})
    .use(authPlugin)
    .get(
        '',
        async ({ userId, params, set }) => {
            const eventTagRepository = new PostgresEventTagRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new GetEventTagsByShopIdUseCase(
                eventTagRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const tags = await useCase.execute(params.shopId, userId!);
                set.status = 200;
                return tags;
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
                summary: 'Get all event tags for a shop',
            },
        },
    )
    .post(
        '',
        async ({ userId, params, body, set }) => {
            const eventTagRepository = new PostgresEventTagRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new CreateEventTagUseCase(
                eventTagRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const tag = await useCase.execute({
                    shopId: params.shopId,
                    userId: userId!,
                    name: body.name,
                    color: body.color,
                    slug: body.slug,
                });
                set.status = 201;
                return tag;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: 'Forbidden' };
                }
                if (error instanceof InvalidEventTagSlugError) {
                    set.status = 400;
                    return { message: error.message };
                }
                if (error instanceof EventTagConflictError) {
                    set.status = 409;
                    return { message: error.message };
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
                    }),
                    color: t.String({
                        minLength: 1,
                        maxLength: 30,
                    }),
                    slug: t.Optional(
                        t.String({
                            minLength: 1,
                            maxLength: 50,
                        }),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Events'],
                summary: 'Create custom event tag for a shop',
            },
        },
    )
    .delete(
        '/:tagId',
        async ({ userId, params, set }) => {
            const eventTagRepository = new PostgresEventTagRepository();
            const eventRepository = new PostgresEventRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new DeleteEventTagUseCase(
                eventTagRepository,
                eventRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const tag = await useCase.execute({
                    shopId: params.shopId,
                    tagId: params.tagId,
                    userId: userId!,
                });
                set.status = 200;
                return tag;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof EventTagNotFoundError) {
                    set.status = 404;
                    return { message: error.message };
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
                    tagId: t.String({
                        minLength: 1,
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Events'],
                summary: 'Delete event tag with null fallback for events',
            },
        },
    );

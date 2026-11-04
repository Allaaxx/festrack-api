import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    CreateShopUseCase,
    GetShopsByUserIdUseCase,
    GetShopByIdUseCase,
    UpdateShopUseCase,
    DeleteShopUseCase,
} from '../use-cases/index.js';
import {
    PostgresShopRepository,
    PostgresShopMemberRepository,
} from '../repositories/postgres/index.js';
import { ShopNotFoundError } from '../errors/shop.js';
import { ForbiddenError } from '../errors/auth.js';

export const shopsRoutes = new Elysia({ prefix: '/api/shops' })
    .use(authPlugin)
    .post(
        '',
        async ({ userId, body, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new CreateShopUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const shop = await useCase.execute({
                    userId: userId!,
                    name: body.name,
                    description: body.description ?? null,
                });
                set.status = 201;
                return shop;
            } catch {
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            body: t.Object(
                {
                    name: t.String({
                        minLength: 1,
                        maxLength: 100,
                        error: 'Name is required.',
                    }),
                    description: t.Optional(
                        t.Nullable(
                            t.String({
                                maxLength: 500,
                                error: 'Description must be at most 500 characters.',
                            }),
                        ),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Create a new shop',
            },
        },
    )
    .get(
        '',
        async ({ userId, set }) => {
            const shopRepository = new PostgresShopRepository();
            const useCase = new GetShopsByUserIdUseCase(shopRepository);

            try {
                const shops = await useCase.execute(userId!);
                set.status = 200;
                return shops;
            } catch {
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            detail: {
                tags: ['Shops'],
                summary: 'Get all shops for current user',
            },
        },
    )
    .get(
        '/:shopId',
        async ({ userId, params, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new GetShopByIdUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const shop = await useCase.execute(params.shopId, userId!);
                set.status = 200;
                return shop;
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
                tags: ['Shops'],
                summary: 'Get shop by id',
            },
        },
    )
    .patch(
        '/:shopId',
        async ({ userId, params, body, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new UpdateShopUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const shop = await useCase.execute(
                    params.shopId,
                    userId!,
                    body,
                );
                set.status = 200;
                return shop;
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
                    name: t.Optional(
                        t.String({
                            minLength: 1,
                            maxLength: 100,
                            error: 'Name must not be empty.',
                        }),
                    ),
                    description: t.Optional(
                        t.Nullable(
                            t.String({
                                maxLength: 500,
                                error: 'Description must be at most 500 characters.',
                            }),
                        ),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Update shop by id',
            },
        },
    )
    .delete(
        '/:shopId',
        async ({ userId, params, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new DeleteShopUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const shop = await useCase.execute(params.shopId, userId!);
                set.status = 200;
                return shop;
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
                tags: ['Shops'],
                summary: 'Delete shop by id',
            },
        },
    );

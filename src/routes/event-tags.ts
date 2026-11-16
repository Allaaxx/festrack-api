import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { GetEventTagsByShopIdUseCase } from '../use-cases/index.js';
import {
    PostgresEventTagRepository,
    PostgresShopRepository,
    PostgresShopMemberRepository,
} from '../repositories/postgres/index.js';
import { ShopNotFoundError } from '../errors/shop.js';
import { ForbiddenError } from '../errors/auth.js';

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
    );

import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    CreateProductUseCase,
    ListProductsUseCase,
    GetProductUseCase,
    DeleteProductUseCase,
} from '../use-cases/index.js';
import {
    PostgresProductRepository,
    PostgresStockRepository,
    PostgresShopRepository,
    PostgresShopMemberRepository,
} from '../repositories/postgres/index.js';
import {
    ProductNotFoundError,
    SlugAlreadyExistsError,
} from '../errors/product.js';
import { ShopNotFoundError } from '../errors/shop.js';
import { ForbiddenError } from '../errors/auth.js';
import { ProductType } from '../domain/index.js';

export const productsRoutes = new Elysia({
    prefix: '/api/shops/:shopId/products',
})
    .use(authPlugin)
    .post(
        '',
        async ({ userId, params, body, set }) => {
            const productRepository = new PostgresProductRepository();
            const stockRepository = new PostgresStockRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new CreateProductUseCase(
                productRepository,
                stockRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const product = await useCase.execute({
                    shopId: params.shopId,
                    userId: userId!,
                    name: body.name,
                    slug: body.slug,
                    type: body.type as ProductType,
                    price: body.price,
                    description: body.description ?? null,
                    images: body.images ?? [],
                    quantity: body.quantity,
                    initial_quantity: body.initial_quantity,
                });
                set.status = 201;
                return product;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: 'Forbidden' };
                }
                if (error instanceof SlugAlreadyExistsError) {
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
                        error: 'Name is required.',
                    }),
                    slug: t.String({
                        minLength: 1,
                        error: 'Slug is required.',
                    }),
                    type: t.Union(
                        [
                            t.Literal('service'),
                            t.Literal('sale'),
                            t.Literal('rent'),
                        ],
                        {
                            error: 'Type must be service, sale, or rent.',
                        },
                    ),
                    price: t.Number({
                        minimum: 0,
                        error: 'Price must be a valid number.',
                    }),
                    description: t.Optional(
                        t.Nullable(
                            t.String({
                                error: 'Description must be a string.',
                            }),
                        ),
                    ),
                    images: t.Optional(
                        t.Array(t.String(), {
                            error: 'Images must be an array of strings.',
                        }),
                    ),
                    quantity: t.Optional(
                        t.Integer({
                            minimum: 0,
                            error: 'Quantity must be a non-negative integer.',
                        }),
                    ),
                    initial_quantity: t.Optional(
                        t.Integer({
                            minimum: 0,
                            error: 'Initial quantity must be a non-negative integer.',
                        }),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Products'],
                summary: 'Create a new product in shop',
            },
        },
    )
    .get(
        '',
        async ({ userId, params, query, set }) => {
            const productRepository = new PostgresProductRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new ListProductsUseCase(
                productRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const products = await useCase.execute(
                    params.shopId,
                    userId!,
                    query?.type as ProductType | undefined,
                );
                set.status = 200;
                return products;
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
            query: t.Optional(
                t.Object(
                    {
                        type: t.Optional(
                            t.Union(
                                [
                                    t.Literal('service'),
                                    t.Literal('sale'),
                                    t.Literal('rent'),
                                ],
                                {
                                    error: 'Type must be service, sale, or rent.',
                                },
                            ),
                        ),
                    },
                    { additionalProperties: false },
                ),
            ),
            detail: {
                tags: ['Products'],
                summary: 'List products in shop',
            },
        },
    )
    .get(
        '/:id',
        async ({ userId, params, set }) => {
            const productRepository = new PostgresProductRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new GetProductUseCase(
                productRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const product = await useCase.execute(
                    params.shopId,
                    params.id,
                    userId!,
                );
                set.status = 200;
                return product;
            } catch (error) {
                if (error instanceof ProductNotFoundError) {
                    set.status = 404;
                    return { message: error.message };
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
                        error: 'Product ID must be a valid UUID.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Products'],
                summary: 'Get product details by ID',
            },
        },
    )
    .delete(
        '/:id',
        async ({ userId, params, set }) => {
            const productRepository = new PostgresProductRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new DeleteProductUseCase(
                productRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const product = await useCase.execute(
                    params.shopId,
                    params.id,
                    userId!,
                );
                set.status = 200;
                return product;
            } catch (error) {
                if (error instanceof ProductNotFoundError) {
                    set.status = 404;
                    return { message: error.message };
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
                        error: 'Product ID must be a valid UUID.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Products'],
                summary: 'Delete product by ID',
            },
        },
    );

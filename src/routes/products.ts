import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    CreateProductUseCase,
    ListProductsUseCase,
    GetProductUseCase,
    DeleteProductUseCase,
    RecordStockAdjustmentUseCase,
    GetStockMovementsUseCase,
} from '../use-cases/index.js';
import {
    PostgresProductRepository,
    PostgresStockRepository,
    PostgresShopRepository,
    PostgresShopMemberRepository,
    PostgresBundleItemRepository,
    PostgresStockMovementRepository,
} from '../repositories/postgres/index.js';
import {
    ProductNotFoundError,
    SlugAlreadyExistsError,
    InvalidBundleComponentError,
    CannotDeleteProductInBundleError,
    InvalidStockAdjustmentError,
    StockNotFoundError,
} from '../errors/product.js';
import { ShopNotFoundError } from '../errors/shop.js';
import { ForbiddenError } from '../errors/auth.js';
import { ProductType } from '../domain/index.js';
import { reserveStockRouteHandler, reserveStockRouteSchema } from './stock.js';

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
            const bundleItemRepository = new PostgresBundleItemRepository();

            const useCase = new CreateProductUseCase(
                productRepository,
                stockRepository,
                shopRepository,
                shopMemberRepository,
                bundleItemRepository,
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
                    is_bundle: body.is_bundle ?? (body as any).isBundle,
                    bundle_items:
                        body.bundle_items ?? (body as any).bundleItems,
                });
                set.status = 201;
                return product;
            } catch (error) {
                if (error instanceof InvalidBundleComponentError) {
                    set.status = 400;
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
                    is_bundle: t.Optional(t.Boolean()),
                    isBundle: t.Optional(t.Boolean()),
                    bundle_items: t.Optional(
                        t.Array(
                            t.Object({
                                product_id: t.String({ format: 'uuid' }),
                                quantity: t.Integer({ minimum: 1 }),
                            }),
                        ),
                    ),
                    bundleItems: t.Optional(
                        t.Array(
                            t.Object({
                                product_id: t.Optional(
                                    t.String({ format: 'uuid' }),
                                ),
                                productId: t.Optional(
                                    t.String({ format: 'uuid' }),
                                ),
                                quantity: t.Integer({ minimum: 1 }),
                            }),
                        ),
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
            const bundleItemRepository = new PostgresBundleItemRepository();

            const useCase = new ListProductsUseCase(
                productRepository,
                shopRepository,
                shopMemberRepository,
                bundleItemRepository,
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
            const bundleItemRepository = new PostgresBundleItemRepository();

            const useCase = new GetProductUseCase(
                productRepository,
                shopRepository,
                shopMemberRepository,
                bundleItemRepository,
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
            const bundleItemRepository = new PostgresBundleItemRepository();

            const useCase = new DeleteProductUseCase(
                productRepository,
                shopRepository,
                shopMemberRepository,
                bundleItemRepository,
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
                if (error instanceof CannotDeleteProductInBundleError) {
                    set.status = 409;
                    return { message: error.message };
                }
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
    )
    .post(
        '/:id/stock/adjust',
        async ({ userId, params, body, set }) => {
            const productRepository = new PostgresProductRepository();
            const stockRepository = new PostgresStockRepository();
            const stockMovementRepository =
                new PostgresStockMovementRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new RecordStockAdjustmentUseCase(
                productRepository,
                stockRepository,
                stockMovementRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const result = await useCase.execute({
                    shopId: params.shopId,
                    productId: params.id,
                    userId: userId!,
                    quantityDelta:
                        body.quantityDelta ??
                        body.quantity_delta ??
                        body.quantity!,
                    type: body.type,
                    notes: body.notes ?? '',
                    referenceId: body.referenceId ?? body.reference_id ?? null,
                });
                set.status = 200;
                return result;
            } catch (error) {
                if (error instanceof InvalidStockAdjustmentError) {
                    set.status = 400;
                    return { message: error.message };
                }
                if (
                    error instanceof ProductNotFoundError ||
                    error instanceof StockNotFoundError
                ) {
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
            body: t.Object(
                {
                    quantityDelta: t.Optional(t.Integer()),
                    quantity_delta: t.Optional(t.Integer()),
                    quantity: t.Optional(t.Integer()),
                    type: t.Union([
                        t.Literal('INBOUND'),
                        t.Literal('ADJUSTMENT'),
                        t.Literal('LOSS'),
                    ]),
                    notes: t.Optional(t.String()),
                    referenceId: t.Optional(t.Nullable(t.String())),
                    reference_id: t.Optional(t.Nullable(t.String())),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Products', 'Stock'],
                summary: 'Record a manual stock adjustment or movement',
            },
        },
    )
    .get(
        '/:id/stock/movements',
        async ({ userId, params, set }) => {
            const productRepository = new PostgresProductRepository();
            const stockRepository = new PostgresStockRepository();
            const stockMovementRepository =
                new PostgresStockMovementRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();

            const useCase = new GetStockMovementsUseCase(
                productRepository,
                stockRepository,
                stockMovementRepository,
                shopRepository,
                shopMemberRepository,
            );

            try {
                const movements = await useCase.execute({
                    shopId: params.shopId,
                    productId: params.id,
                    userId: userId!,
                });
                set.status = 200;
                return movements;
            } catch (error) {
                if (
                    error instanceof ProductNotFoundError ||
                    error instanceof StockNotFoundError
                ) {
                    set.status = 404;
                    return { message: error.message };
                }
                if (error instanceof InvalidStockAdjustmentError) {
                    set.status = 400;
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
                tags: ['Products', 'Stock'],
                summary: 'Get stock movements for a product',
            },
        },
    )
    .post('/stock/reserve', reserveStockRouteHandler, reserveStockRouteSchema);

import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    ReserveStockUseCase,
    CheckinRentalReturnUseCase,
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
    StockNotFoundError,
    InsufficientStockError,
    InvalidStockAdjustmentError,
    InvalidRentalReturnError,
} from '../errors/product.js';
import { ShopNotFoundError } from '../errors/shop.js';
import { ForbiddenError } from '../errors/auth.js';

export const reserveStockRouteHandler = async ({
    userId,
    params,
    body,
    set,
}: {
    userId: string | null;
    params: { shopId: string };
    body: {
        items: Array<{
            product_id?: string;
            productId?: string;
            quantity: number;
            type?: 'sale' | 'rent';
        }>;
        referenceId?: string | null;
        reference_id?: string | null;
        notes?: string | null;
    };
    set: { status?: number | string };
}) => {
    const productRepository = new PostgresProductRepository();
    const stockRepository = new PostgresStockRepository();
    const stockMovementRepository = new PostgresStockMovementRepository();
    const shopRepository = new PostgresShopRepository();
    const shopMemberRepository = new PostgresShopMemberRepository();
    const bundleItemRepository = new PostgresBundleItemRepository();

    const useCase = new ReserveStockUseCase(
        productRepository,
        stockRepository,
        stockMovementRepository,
        shopRepository,
        shopMemberRepository,
        bundleItemRepository,
    );

    try {
        const result = await useCase.execute({
            shopId: params.shopId,
            userId: userId!,
            referenceId: body.referenceId ?? body.reference_id ?? null,
            notes: body.notes ?? null,
            items: body.items.map((item) => {
                const pId = item.product_id || item.productId;
                if (!pId) {
                    throw new InvalidStockAdjustmentError(
                        'Item product_id is required.',
                    );
                }
                return {
                    productId: pId,
                    product_id: pId,
                    quantity: item.quantity,
                    type: item.type,
                };
            }),
        });

        set.status = 200;
        return result;
    } catch (error) {
        if (error instanceof InsufficientStockError) {
            set.status = 409;
            return {
                message: error.message,
                details: error.details,
            };
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
        if (error instanceof InvalidStockAdjustmentError) {
            set.status = 400;
            return { message: error.message };
        }
        set.status = 500;
        return { message: 'Internal server error' };
    }
};

export const reserveStockRouteSchema = {
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
            items: t.Array(
                t.Object(
                    {
                        product_id: t.Optional(
                            t.String({
                                format: 'uuid',
                                error: 'Product ID must be a valid UUID.',
                            }),
                        ),
                        productId: t.Optional(
                            t.String({
                                format: 'uuid',
                                error: 'Product ID must be a valid UUID.',
                            }),
                        ),
                        quantity: t.Integer({
                            minimum: 1,
                            error: 'Quantity must be an integer >= 1.',
                        }),
                        type: t.Optional(
                            t.Union([t.Literal('sale'), t.Literal('rent')]),
                        ),
                    },
                    { additionalProperties: false },
                ),
                { minItems: 1, error: 'At least one item is required.' },
            ),
            referenceId: t.Optional(t.Nullable(t.String())),
            reference_id: t.Optional(t.Nullable(t.String())),
            notes: t.Optional(t.Nullable(t.String())),
        },
        { additionalProperties: false },
    ),
    detail: {
        tags: ['Products', 'Stock'],
        summary: 'Atomic concurrency-safe stock reservation',
    },
};

export const checkinRentalReturnRouteHandler = async ({
    userId,
    params,
    body,
    set,
}: {
    userId: string | null;
    params: { shopId: string };
    body: {
        items: Array<{
            product_id?: string;
            productId?: string;
            returned_quantity?: number;
            returnedQuantity?: number;
            damaged_quantity?: number;
            damagedQuantity?: number;
            notes?: string | null;
        }>;
        referenceId?: string | null;
        reference_id?: string | null;
        notes?: string | null;
    };
    set: { status?: number | string };
}) => {
    const productRepository = new PostgresProductRepository();
    const stockRepository = new PostgresStockRepository();
    const stockMovementRepository = new PostgresStockMovementRepository();
    const shopRepository = new PostgresShopRepository();
    const shopMemberRepository = new PostgresShopMemberRepository();
    const bundleItemRepository = new PostgresBundleItemRepository();

    const useCase = new CheckinRentalReturnUseCase(
        productRepository,
        stockRepository,
        stockMovementRepository,
        shopRepository,
        shopMemberRepository,
        bundleItemRepository,
    );

    try {
        const result = await useCase.execute({
            shopId: params.shopId,
            userId: userId!,
            referenceId: body.referenceId ?? body.reference_id ?? null,
            notes: body.notes ?? null,
            items: body.items.map((item) => {
                const pId = item.product_id || item.productId;
                if (!pId) {
                    throw new InvalidRentalReturnError(
                        'Item product_id is required.',
                    );
                }
                return {
                    productId: pId,
                    product_id: pId,
                    returnedQuantity:
                        item.returnedQuantity ?? item.returned_quantity ?? 0,
                    returned_quantity:
                        item.returnedQuantity ?? item.returned_quantity ?? 0,
                    damagedQuantity:
                        item.damagedQuantity ?? item.damaged_quantity ?? 0,
                    damaged_quantity:
                        item.damagedQuantity ?? item.damaged_quantity ?? 0,
                    notes: item.notes ?? null,
                };
            }),
        });

        set.status = 200;
        return result;
    } catch (error) {
        if (error instanceof InvalidRentalReturnError) {
            set.status = error.statusCode ?? 400;
            return {
                message: error.message,
                details: error.details,
            };
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
        if (error instanceof InvalidStockAdjustmentError) {
            set.status = 400;
            return { message: error.message };
        }
        set.status = 500;
        return { message: 'Internal server error' };
    }
};

export const checkinRentalReturnRouteSchema = {
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
            items: t.Array(
                t.Object(
                    {
                        product_id: t.Optional(
                            t.String({
                                format: 'uuid',
                                error: 'Product ID must be a valid UUID.',
                            }),
                        ),
                        productId: t.Optional(
                            t.String({
                                format: 'uuid',
                                error: 'Product ID must be a valid UUID.',
                            }),
                        ),
                        returned_quantity: t.Optional(
                            t.Integer({
                                minimum: 0,
                                error: 'Returned quantity must be an integer >= 0.',
                            }),
                        ),
                        returnedQuantity: t.Optional(
                            t.Integer({
                                minimum: 0,
                                error: 'Returned quantity must be an integer >= 0.',
                            }),
                        ),
                        damaged_quantity: t.Optional(
                            t.Integer({
                                minimum: 0,
                                default: 0,
                                error: 'Damaged quantity must be an integer >= 0.',
                            }),
                        ),
                        damagedQuantity: t.Optional(
                            t.Integer({
                                minimum: 0,
                                default: 0,
                                error: 'Damaged quantity must be an integer >= 0.',
                            }),
                        ),
                        notes: t.Optional(t.Nullable(t.String())),
                    },
                    { additionalProperties: false },
                ),
                { minItems: 1, error: 'At least one item is required.' },
            ),
            referenceId: t.Optional(t.Nullable(t.String())),
            reference_id: t.Optional(t.Nullable(t.String())),
            notes: t.Optional(t.Nullable(t.String())),
        },
        { additionalProperties: false },
    ),
    detail: {
        tags: ['Products', 'Stock'],
        summary: 'Component-level rental return check-in and loss reporting',
    },
};

export const stockRoutes = new Elysia({
    prefix: '/api/shops/:shopId/stock',
})
    .use(authPlugin)
    .post('/reserve', reserveStockRouteHandler, reserveStockRouteSchema)
    .post(
        '/checkin',
        checkinRentalReturnRouteHandler,
        checkinRentalReturnRouteSchema,
    );

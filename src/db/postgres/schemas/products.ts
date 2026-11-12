import { relations } from 'drizzle-orm';
import {
    boolean,
    index,
    integer,
    json,
    numeric,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core';
import { shops } from './shops.js';
import { user } from './users.js';

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
    'INBOUND',
    'SALE',
    'RENTAL_ALLOCATION',
    'RENTAL_RETURN',
    'LOSS',
    'ADJUSTMENT',
]);

export const productTypeEnum = pgEnum('product_type', [
    'service',
    'sale',
    'rent',
]);

export const products = pgTable(
    'products',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        shop_id: text('shop_id')
            .notNull()
            .references(() => shops.id, {
                onDelete: 'cascade',
                onUpdate: 'cascade',
            }),
        name: varchar('name', { length: 255 }).notNull(),
        slug: varchar('slug', { length: 255 }).notNull().unique(),
        type: productTypeEnum('type').notNull(),
        price: numeric('price', { precision: 10, scale: 2 }).notNull(),
        description: text('description'),
        images: json('images').$type<string[]>().default([]).notNull(),
        is_bundle: boolean('is_bundle').default(false).notNull(),
        created_at: timestamp('created_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .notNull(),
        updated_at: timestamp('updated_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex('products_slug_idx').on(table.slug),
        index('products_shop_idx').on(table.shop_id),
        index('products_type_idx').on(table.type),
    ],
);

export const productsTable = products;

export const stock = pgTable(
    'stock',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        product_id: text('product_id')
            .notNull()
            .unique()
            .references(() => products.id, {
                onDelete: 'cascade',
                onUpdate: 'cascade',
            }),
        quantity: integer('quantity').default(0).notNull(),
        reserved: integer('reserved').default(0).notNull(),
        updated_at: timestamp('updated_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [uniqueIndex('stock_product_idx').on(table.product_id)],
);

export const stockTable = stock;

export const bundleItems = pgTable(
    'bundle_items',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        bundle_product_id: text('bundle_product_id')
            .notNull()
            .references(() => products.id, {
                onDelete: 'cascade',
                onUpdate: 'cascade',
            }),
        product_id: text('product_id')
            .notNull()
            .references(() => products.id, {
                onDelete: 'restrict',
                onUpdate: 'cascade',
            }),
        quantity: integer('quantity').default(1).notNull(),
        created_at: timestamp('created_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .notNull(),
        updated_at: timestamp('updated_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index('bundle_items_bundle_product_idx').on(table.bundle_product_id),
        index('bundle_items_product_idx').on(table.product_id),
    ],
);

export const bundleItemsTable = bundleItems;

export const stockMovements = pgTable(
    'stock_movements',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        stockId: text('stock_id')
            .notNull()
            .references(() => stock.id, {
                onDelete: 'cascade',
                onUpdate: 'cascade',
            }),
        type: stockMovementTypeEnum('type').notNull(),
        quantity: integer('quantity').notNull(),
        notes: text('notes'),
        referenceId: text('reference_id'),
        createdByUserId: text('created_by_user_id').references(() => user.id, {
            onDelete: 'set null',
        }),
        createdAt: timestamp('created_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index('stock_movements_stock_idx').on(table.stockId),
        index('stock_movements_created_at_idx').on(table.createdAt),
    ],
);

export const stockMovementsTable = stockMovements;

export const productsRelations = relations(products, ({ one, many }) => ({
    shop: one(shops, {
        fields: [products.shop_id],
        references: [shops.id],
    }),
    stock: one(stock, {
        fields: [products.id],
        references: [stock.product_id],
    }),
    bundleItems: many(bundleItems, { relationName: 'bundle_to_items' }),
    usedInBundles: many(bundleItems, { relationName: 'component_to_bundles' }),
}));

export const stockRelations = relations(stock, ({ one, many }) => ({
    product: one(products, {
        fields: [stock.product_id],
        references: [products.id],
    }),
    movements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
    stock: one(stock, {
        fields: [stockMovements.stockId],
        references: [stock.id],
    }),
    createdByUser: one(user, {
        fields: [stockMovements.createdByUserId],
        references: [user.id],
    }),
}));

export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
    bundleProduct: one(products, {
        fields: [bundleItems.bundle_product_id],
        references: [products.id],
        relationName: 'bundle_to_items',
    }),
    product: one(products, {
        fields: [bundleItems.product_id],
        references: [products.id],
        relationName: 'component_to_bundles',
    }),
}));

export type ProductTableInsert = typeof products.$inferInsert;
export type ProductTableSelect = typeof products.$inferSelect;
export type StockTableInsert = typeof stock.$inferInsert;
export type StockTableSelect = typeof stock.$inferSelect;
export type BundleItemTableInsert = typeof bundleItems.$inferInsert;
export type BundleItemTableSelect = typeof bundleItems.$inferSelect;
export type StockMovementTableInsert = typeof stockMovements.$inferInsert;
export type StockMovementTableSelect = typeof stockMovements.$inferSelect;

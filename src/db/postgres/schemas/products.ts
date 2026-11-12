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

export const productsRelations = relations(products, ({ one }) => ({
    shop: one(shops, {
        fields: [products.shop_id],
        references: [shops.id],
    }),
    stock: one(stock, {
        fields: [products.id],
        references: [stock.product_id],
    }),
}));

export const stockRelations = relations(stock, ({ one }) => ({
    product: one(products, {
        fields: [stock.product_id],
        references: [products.id],
    }),
}));

export type ProductTableInsert = typeof products.$inferInsert;
export type ProductTableSelect = typeof products.$inferSelect;
export type StockTableInsert = typeof stock.$inferInsert;
export type StockTableSelect = typeof stock.$inferSelect;

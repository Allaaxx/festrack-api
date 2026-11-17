import { relations } from 'drizzle-orm';
import {
    boolean,
    index,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core';
import { shops } from './shops.js';

export const eventTags = pgTable(
    'event_tags',
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
        name: varchar('name', { length: 50 }).notNull(),
        slug: varchar('slug', { length: 50 }).notNull(),
        color: varchar('color', { length: 30 }).notNull(),
        is_system: boolean('is_system').default(false).notNull(),
        created_at: timestamp('created_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex('event_tags_shop_slug_idx').on(table.shop_id, table.slug),
        index('event_tags_shop_idx').on(table.shop_id),
    ],
);

export const eventTagsTable = eventTags;

export const eventTagsRelations = relations(eventTags, ({ one }) => ({
    shop: one(shops, {
        fields: [eventTags.shop_id],
        references: [shops.id],
    }),
}));

export type EventTagTableInsert = typeof eventTags.$inferInsert;
export type EventTagTableSelect = typeof eventTags.$inferSelect;

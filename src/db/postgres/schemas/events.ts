import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { user } from './users.js';
import { shops } from './shops.js';
import { transactionsTable } from './transactions.js';

export const eventsTable = pgTable('Event', {
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
    description: varchar('description', { length: 200 }),
    start_date: timestamp('start_date', {
        precision: 3,
        mode: 'date',
    }).notNull(),
    end_date: timestamp('end_date', { precision: 3, mode: 'date' }).notNull(),
    created_by_user_id: text('created_by_user_id')
        .notNull()
        .references(() => user.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),
    google_event_id: text('google_event_id'),
});

export const eventsRelations = relations(eventsTable, ({ one, many }) => ({
    shop: one(shops, {
        fields: [eventsTable.shop_id],
        references: [shops.id],
    }),
    creator: one(user, {
        fields: [eventsTable.created_by_user_id],
        references: [user.id],
    }),
    transactions: many(transactionsTable),
}));

export type EventTableInsert = typeof eventsTable.$inferInsert;
export type EventTableSelect = typeof eventsTable.$inferSelect;

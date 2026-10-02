import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { user } from './users.js';
import { transactionsTable } from './transactions.js';

export const eventsTable = pgTable('Event', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 50 }).notNull(),
    description: varchar('description', { length: 200 }),
    start_date: timestamp('start_date', {
        precision: 3,
        mode: 'date',
    }).notNull(),
    end_date: timestamp('end_date', { precision: 3, mode: 'date' }).notNull(),
    user_id: text('user_id')
        .notNull()
        .references(() => user.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),
});

export const eventsRelations = relations(eventsTable, ({ one, many }) => ({
    user: one(user, {
        fields: [eventsTable.user_id],
        references: [user.id],
    }),
    transactions: many(transactionsTable),
}));

export type EventTableInsert = typeof eventsTable.$inferInsert;
export type EventTableSelect = typeof eventsTable.$inferSelect;

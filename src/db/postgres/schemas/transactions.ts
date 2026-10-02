import { relations } from 'drizzle-orm';
import {
    date,
    numeric,
    pgEnum,
    pgTable,
    text,
    varchar,
} from 'drizzle-orm/pg-core';
import { usersTable } from './users.js';
import { eventsTable } from './events.js';

export const transactionTypeEnum = pgEnum('TransactionType', [
    'EXPENSE',
    'EARNING',
    'INVESTMENT',
]);

export const transactionsTable = pgTable('Transaction', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    user_id: text('user_id')
        .notNull()
        .references(() => usersTable.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),
    name: varchar('name', { length: 50 }).notNull(),
    date: date('date', { mode: 'date' }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    event_id: text('event_id').references(() => eventsTable.id, {
        onDelete: 'set null',
        onUpdate: 'cascade',
    }),
});

export const transactionsRelations = relations(
    transactionsTable,
    ({ one }) => ({
        user: one(usersTable, {
            fields: [transactionsTable.user_id],
            references: [usersTable.id],
        }),
        event: one(eventsTable, {
            fields: [transactionsTable.event_id],
            references: [eventsTable.id],
        }),
    }),
);

export type TransactionTableInsert = typeof transactionsTable.$inferInsert;
export type TransactionTableSelect = typeof transactionsTable.$inferSelect;

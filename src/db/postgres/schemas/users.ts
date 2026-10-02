import { relations } from 'drizzle-orm';
import { pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { eventsTable } from './events.js';
import { transactionsTable } from './transactions.js';

export const usersTable = pgTable(
    'User',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        first_name: varchar('first_name', { length: 50 }).notNull(),
        last_name: varchar('last_name', { length: 50 }).notNull(),
        email: varchar('email', { length: 100 }).notNull(),
        password: varchar('password', { length: 100 }).notNull(),
    },
    (table) => [uniqueIndex('User_email_key').on(table.email)],
);

export const usersRelations = relations(usersTable, ({ many }) => ({
    events: many(eventsTable),
    transactions: many(transactionsTable),
}));

export type UserTableInsert = typeof usersTable.$inferInsert;
export type UserTableSelect = typeof usersTable.$inferSelect;

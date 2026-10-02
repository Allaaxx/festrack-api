import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { eventsTable } from './events.js';
import { transactionsTable } from './transactions.js';
import { session, account } from './auth.js';

export const user = pgTable('user', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text('name')
        .notNull()
        .$defaultFn(() => ''),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
    first_name: text('first_name').notNull(),
    last_name: text('last_name').notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
    events: many(eventsTable),
    transactions: many(transactionsTable),
}));

export const usersTable = user;
export const usersRelations = userRelations;

export type UserTableInsert = typeof user.$inferInsert;
export type UserTableSelect = typeof user.$inferSelect;

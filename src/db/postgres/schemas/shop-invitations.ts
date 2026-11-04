import { relations } from 'drizzle-orm';
import {
    index,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core';
import { shops, shopRoleEnum } from './shops.js';

export const invitationStatusEnum = pgEnum('invitation_status', [
    'PENDING',
    'ACCEPTED',
    'REVOKED',
]);

export const shopInvitations = pgTable(
    'shop_invitations',
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
        email: varchar('email', { length: 255 }).notNull(),
        role: shopRoleEnum('role').default('MEMBER').notNull(),
        token: text('token').notNull().unique(),
        status: invitationStatusEnum('status').default('PENDING').notNull(),
        expires_at: timestamp('expires_at', {
            precision: 3,
            mode: 'date',
        }).notNull(),
        created_at: timestamp('created_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .notNull(),
        updated_at: timestamp('updated_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex('shop_invitations_token_idx').on(table.token),
        index('shop_invitations_shop_idx').on(table.shop_id),
        index('shop_invitations_email_idx').on(table.email),
        index('shop_invitations_shop_email_idx').on(table.shop_id, table.email),
    ],
);

export const shopInvitationsRelations = relations(
    shopInvitations,
    ({ one }) => ({
        shop: one(shops, {
            fields: [shopInvitations.shop_id],
            references: [shops.id],
        }),
    }),
);

export const shopInvitationsTable = shopInvitations;

export type ShopInvitationTableInsert = typeof shopInvitations.$inferInsert;
export type ShopInvitationTableSelect = typeof shopInvitations.$inferSelect;

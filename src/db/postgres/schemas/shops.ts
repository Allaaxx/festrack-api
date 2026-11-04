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
import { user } from './users.js';
import { eventsTable } from './events.js';

export const shopRoleEnum = pgEnum('shop_role', ['OWNER', 'MEMBER']);

export const shops = pgTable('shops', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    created_at: timestamp('created_at', { precision: 3, mode: 'date' })
        .defaultNow()
        .notNull(),
    updated_at: timestamp('updated_at', { precision: 3, mode: 'date' })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const shopMembers = pgTable(
    'shop_members',
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
        user_id: text('user_id')
            .notNull()
            .references(() => user.id, {
                onDelete: 'cascade',
                onUpdate: 'cascade',
            }),
        role: shopRoleEnum('role').notNull(),
        created_at: timestamp('created_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .notNull(),
        updated_at: timestamp('updated_at', { precision: 3, mode: 'date' })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex('shop_members_shop_user_idx').on(
            table.shop_id,
            table.user_id,
        ),
        index('shop_members_shop_idx').on(table.shop_id),
        index('shop_members_user_idx').on(table.user_id),
    ],
);

export const shopsRelations = relations(shops, ({ many }) => ({
    members: many(shopMembers),
    events: many(eventsTable),
}));

export const shopMembersRelations = relations(shopMembers, ({ one }) => ({
    shop: one(shops, {
        fields: [shopMembers.shop_id],
        references: [shops.id],
    }),
    user: one(user, {
        fields: [shopMembers.user_id],
        references: [user.id],
    }),
}));

export const shopsTable = shops;
export const shopMembersTable = shopMembers;

export type ShopTableInsert = typeof shops.$inferInsert;
export type ShopTableSelect = typeof shops.$inferSelect;
export type ShopMemberTableInsert = typeof shopMembers.$inferInsert;
export type ShopMemberTableSelect = typeof shopMembers.$inferSelect;

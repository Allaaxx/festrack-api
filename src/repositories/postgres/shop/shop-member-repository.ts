import { and, eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import {
    shopMembersTable,
    usersTable,
} from '../../../db/postgres/schemas/index.js';
import { ShopMemberNotFoundError } from '../../../errors/shop.js';
import {
    ShopMember,
    ShopMemberWithUser,
    ShopRole,
    CreateShopMemberParams,
    ShopMemberRepository,
} from '../../../domain/index.js';

export type { ShopMemberRepository };

export class PostgresShopMemberRepository implements ShopMemberRepository {
    constructor(private readonly database: Database = db) {}

    async create(params: CreateShopMemberParams): Promise<ShopMember> {
        const [createdMember] = await this.database
            .insert(shopMembersTable)
            .values({
                shop_id: params.shop_id,
                user_id: params.user_id,
                role: params.role,
            })
            .returning();

        return createdMember;
    }

    async findByShopAndUserId(
        shopId: string,
        userId: string,
    ): Promise<ShopMember | null> {
        const [member] = await this.database
            .select()
            .from(shopMembersTable)
            .where(
                and(
                    eq(shopMembersTable.shop_id, shopId),
                    eq(shopMembersTable.user_id, userId),
                ),
            );

        return member || null;
    }

    async findByShopId(shopId: string): Promise<ShopMember[]> {
        return await this.database
            .select()
            .from(shopMembersTable)
            .where(eq(shopMembersTable.shop_id, shopId));
    }

    async findByShopIdWithUsers(shopId: string): Promise<ShopMemberWithUser[]> {
        const rows = await this.database
            .select({
                id: shopMembersTable.id,
                shop_id: shopMembersTable.shop_id,
                user_id: shopMembersTable.user_id,
                role: shopMembersTable.role,
                created_at: shopMembersTable.created_at,
                updated_at: shopMembersTable.updated_at,
                user: {
                    id: usersTable.id,
                    name: usersTable.name,
                    email: usersTable.email,
                    first_name: usersTable.first_name,
                    last_name: usersTable.last_name,
                    image: usersTable.image,
                },
            })
            .from(shopMembersTable)
            .innerJoin(usersTable, eq(shopMembersTable.user_id, usersTable.id))
            .where(eq(shopMembersTable.shop_id, shopId));

        return rows;
    }

    async findByUserId(userId: string): Promise<ShopMember[]> {
        return await this.database
            .select()
            .from(shopMembersTable)
            .where(eq(shopMembersTable.user_id, userId));
    }

    async updateRole(
        shopId: string,
        userId: string,
        role: ShopRole,
    ): Promise<ShopMember> {
        const [updatedMember] = await this.database
            .update(shopMembersTable)
            .set({ role })
            .where(
                and(
                    eq(shopMembersTable.shop_id, shopId),
                    eq(shopMembersTable.user_id, userId),
                ),
            )
            .returning();

        if (!updatedMember) {
            throw new ShopMemberNotFoundError(shopId, userId);
        }

        return updatedMember;
    }

    async countOwners(shopId: string): Promise<number> {
        const owners = await this.database
            .select()
            .from(shopMembersTable)
            .where(
                and(
                    eq(shopMembersTable.shop_id, shopId),
                    eq(shopMembersTable.role, 'OWNER'),
                ),
            );

        return owners.length;
    }

    async delete(shopId: string, userId: string): Promise<ShopMember> {
        const [deletedMember] = await this.database
            .delete(shopMembersTable)
            .where(
                and(
                    eq(shopMembersTable.shop_id, shopId),
                    eq(shopMembersTable.user_id, userId),
                ),
            )
            .returning();

        if (!deletedMember) {
            throw new ShopMemberNotFoundError(shopId, userId);
        }

        return deletedMember;
    }
}

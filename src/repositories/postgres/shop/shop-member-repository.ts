import { and, eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import { shopMembersTable } from '../../../db/postgres/schemas/index.js';
import { ShopMemberNotFoundError } from '../../../errors/shop.js';
import {
    ShopMember,
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

    async findByUserId(userId: string): Promise<ShopMember[]> {
        return await this.database
            .select()
            .from(shopMembersTable)
            .where(eq(shopMembersTable.user_id, userId));
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

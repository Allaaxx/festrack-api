import { eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import {
    shopsTable,
    shopMembersTable,
} from '../../../db/postgres/schemas/index.js';
import { ShopNotFoundError } from '../../../errors/shop.js';
import {
    Shop,
    CreateShopParams,
    UpdateShopParams,
    UserShop,
    ShopRepository,
} from '../../../domain/index.js';

export type { ShopRepository };

export class PostgresShopRepository implements ShopRepository {
    constructor(private readonly database: Database = db) {}

    async create(createShopParams: CreateShopParams): Promise<Shop> {
        const [createdShop] = await this.database
            .insert(shopsTable)
            .values({
                name: createShopParams.name,
                description: createShopParams.description ?? null,
            })
            .returning();

        return createdShop;
    }

    async findById(shopId: string): Promise<Shop | null> {
        const [shop] = await this.database
            .select()
            .from(shopsTable)
            .where(eq(shopsTable.id, shopId));

        return shop || null;
    }

    async findByUserId(userId: string): Promise<UserShop[]> {
        const results = await this.database
            .select({
                id: shopsTable.id,
                name: shopsTable.name,
                description: shopsTable.description,
                created_at: shopsTable.created_at,
                updated_at: shopsTable.updated_at,
                role: shopMembersTable.role,
            })
            .from(shopsTable)
            .innerJoin(
                shopMembersTable,
                eq(shopsTable.id, shopMembersTable.shop_id),
            )
            .where(eq(shopMembersTable.user_id, userId));

        return results;
    }

    async update(
        shopId: string,
        updateShopParams: UpdateShopParams,
    ): Promise<Shop> {
        const [updatedShop] = await this.database
            .update(shopsTable)
            .set({
                ...(updateShopParams.name !== undefined && {
                    name: updateShopParams.name,
                }),
                ...(updateShopParams.description !== undefined && {
                    description: updateShopParams.description,
                }),
                updated_at: new Date(),
            })
            .where(eq(shopsTable.id, shopId))
            .returning();

        if (!updatedShop) {
            throw new ShopNotFoundError(shopId);
        }

        return updatedShop;
    }

    async delete(shopId: string): Promise<Shop> {
        const [deletedShop] = await this.database
            .delete(shopsTable)
            .where(eq(shopsTable.id, shopId))
            .returning();

        if (!deletedShop) {
            throw new ShopNotFoundError(shopId);
        }

        return deletedShop;
    }
}

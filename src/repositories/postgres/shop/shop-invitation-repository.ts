import { and, eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import { shopInvitationsTable } from '../../../db/postgres/schemas/index.js';
import { ShopInvitationNotFoundError } from '../../../errors/shop.js';
import {
    ShopInvitation,
    CreateShopInvitationParams,
    UpdateShopInvitationParams,
    ShopInvitationRepository,
} from '../../../domain/index.js';

export type { ShopInvitationRepository };

export class PostgresShopInvitationRepository implements ShopInvitationRepository {
    constructor(private readonly database: Database = db) {}

    async create(params: CreateShopInvitationParams): Promise<ShopInvitation> {
        const [createdInvitation] = await this.database
            .insert(shopInvitationsTable)
            .values({
                shop_id: params.shop_id,
                email: params.email.toLowerCase(),
                role: params.role,
                token: params.token,
                expires_at: params.expires_at,
                status: params.status ?? 'PENDING',
            })
            .returning();

        return createdInvitation;
    }

    async findById(id: string): Promise<ShopInvitation | null> {
        const [invitation] = await this.database
            .select()
            .from(shopInvitationsTable)
            .where(eq(shopInvitationsTable.id, id));

        return invitation || null;
    }

    async findByToken(token: string): Promise<ShopInvitation | null> {
        const [invitation] = await this.database
            .select()
            .from(shopInvitationsTable)
            .where(eq(shopInvitationsTable.token, token));

        return invitation || null;
    }

    async findPendingByShopIdAndEmail(
        shopId: string,
        email: string,
    ): Promise<ShopInvitation | null> {
        const [invitation] = await this.database
            .select()
            .from(shopInvitationsTable)
            .where(
                and(
                    eq(shopInvitationsTable.shop_id, shopId),
                    eq(shopInvitationsTable.email, email.toLowerCase()),
                    eq(shopInvitationsTable.status, 'PENDING'),
                ),
            );

        return invitation || null;
    }

    async findPendingByShopId(shopId: string): Promise<ShopInvitation[]> {
        return await this.database
            .select()
            .from(shopInvitationsTable)
            .where(
                and(
                    eq(shopInvitationsTable.shop_id, shopId),
                    eq(shopInvitationsTable.status, 'PENDING'),
                ),
            );
    }

    async update(
        id: string,
        params: UpdateShopInvitationParams,
    ): Promise<ShopInvitation> {
        const updateValues: Partial<typeof shopInvitationsTable.$inferInsert> =
            {};
        if (params.token !== undefined) updateValues.token = params.token;
        if (params.role !== undefined) updateValues.role = params.role;
        if (params.status !== undefined) updateValues.status = params.status;
        if (params.expires_at !== undefined)
            updateValues.expires_at = params.expires_at;

        const [updatedInvitation] = await this.database
            .update(shopInvitationsTable)
            .set(updateValues)
            .where(eq(shopInvitationsTable.id, id))
            .returning();

        if (!updatedInvitation) {
            throw new ShopInvitationNotFoundError(
                `Invitation with id ${id} not found.`,
            );
        }

        return updatedInvitation;
    }
}

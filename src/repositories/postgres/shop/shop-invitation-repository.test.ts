import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../../../db/postgres/index.js';
import { shopsTable } from '../../../db/postgres/schemas/index.js';
import { PostgresShopInvitationRepository } from './shop-invitation-repository.js';
import { ShopInvitationNotFoundError } from '../../../errors/shop.js';

describe('Postgres Shop Invitation Repository', () => {
    let sut: PostgresShopInvitationRepository;

    beforeEach(() => {
        sut = new PostgresShopInvitationRepository();
    });

    describe('create', () => {
        it('should create a shop invitation', async () => {
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Invite Shop' })
                .returning();

            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const invitation = await sut.create({
                shop_id: shop.id,
                email: 'INVITEE@EXAMPLE.COM',
                role: 'MEMBER',
                token,
                expires_at: expiresAt,
            });

            expect(invitation.id).toBeDefined();
            expect(invitation.shop_id).toBe(shop.id);
            expect(invitation.email).toBe('invitee@example.com');
            expect(invitation.role).toBe('MEMBER');
            expect(invitation.token).toBe(token);
            expect(invitation.status).toBe('PENDING');
            expect(invitation.expires_at).toBeDefined();
        });
    });

    describe('findById', () => {
        it('should return invitation by id', async () => {
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Find Id Shop' })
                .returning();

            const created = await sut.create({
                shop_id: shop.id,
                email: 'findid@example.com',
                role: 'MEMBER',
                token: crypto.randomUUID(),
                expires_at: new Date(),
            });

            const found = await sut.findById(created.id);
            expect(found).not.toBeNull();
            expect(found?.id).toBe(created.id);
        });

        it('should return null if not found', async () => {
            const found = await sut.findById(crypto.randomUUID());
            expect(found).toBeNull();
        });
    });

    describe('findByToken', () => {
        it('should return invitation by token', async () => {
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Find Token Shop' })
                .returning();

            const token = crypto.randomUUID();
            await sut.create({
                shop_id: shop.id,
                email: 'token@example.com',
                role: 'MEMBER',
                token,
                expires_at: new Date(),
            });

            const found = await sut.findByToken(token);
            expect(found).not.toBeNull();
            expect(found?.token).toBe(token);
        });

        it('should return null if token does not exist', async () => {
            const found = await sut.findByToken('non-existent');
            expect(found).toBeNull();
        });
    });

    describe('findPendingByShopIdAndEmail', () => {
        it('should find pending invitation by shopId and email (case insensitive)', async () => {
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Pending Shop' })
                .returning();

            const token = crypto.randomUUID();
            await sut.create({
                shop_id: shop.id,
                email: 'pending_case@example.com',
                role: 'MEMBER',
                token,
                expires_at: new Date(),
            });

            const found = await sut.findPendingByShopIdAndEmail(
                shop.id,
                'PENDING_CASE@EXAMPLE.COM',
            );
            expect(found).not.toBeNull();
            expect(found?.email).toBe('pending_case@example.com');
        });
    });

    describe('findPendingByShopId', () => {
        it('should list all pending invitations for shop', async () => {
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Pending List Shop' })
                .returning();

            const futureDate = new Date(Date.now() + 1000 * 60 * 60);
            await sut.create({
                shop_id: shop.id,
                email: 'p1@example.com',
                role: 'MEMBER',
                token: crypto.randomUUID(),
                expires_at: futureDate,
            });

            await sut.create({
                shop_id: shop.id,
                email: 'p2@example.com',
                role: 'MEMBER',
                token: crypto.randomUUID(),
                expires_at: futureDate,
            });

            // Also create an expired pending invite which should NOT be returned
            await sut.create({
                shop_id: shop.id,
                email: 'expired@example.com',
                role: 'MEMBER',
                token: crypto.randomUUID(),
                expires_at: new Date(Date.now() - 1000 * 60),
            });

            const list = await sut.findPendingByShopId(shop.id);
            expect(list.length).toBe(2);
            expect(list.some((i) => i.email === 'expired@example.com')).toBe(
                false,
            );
        });
    });

    describe('update', () => {
        it('should update invitation fields', async () => {
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Update Shop' })
                .returning();

            const created = await sut.create({
                shop_id: shop.id,
                email: 'updateme@example.com',
                role: 'MEMBER',
                token: crypto.randomUUID(),
                expires_at: new Date(),
            });

            const newToken = crypto.randomUUID();
            const updated = await sut.update(created.id, {
                token: newToken,
                status: 'REVOKED',
            });

            expect(updated.token).toBe(newToken);
            expect(updated.status).toBe('REVOKED');
        });

        it('should throw ShopInvitationNotFoundError if invitation does not exist', async () => {
            await expect(
                sut.update(crypto.randomUUID(), { status: 'REVOKED' }),
            ).rejects.toThrow(ShopInvitationNotFoundError);
        });
    });
});

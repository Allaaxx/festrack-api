import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../../../db/postgres/index.js';
import { shopsTable, usersTable } from '../../../db/postgres/schemas/index.js';
import { user } from '../../../tests/index.js';
import { PostgresShopMemberRepository } from './shop-member-repository.js';
import { ShopMemberNotFoundError } from '../../../errors/shop.js';

describe('Postgres Shop Member Repository', () => {
    let sut: PostgresShopMemberRepository;

    beforeEach(() => {
        sut = new PostgresShopMemberRepository();
    });

    describe('create', () => {
        it('should create a shop member', async () => {
            await db.insert(usersTable).values(user);
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Member Shop' })
                .returning();

            const member = await sut.create({
                shop_id: shop.id,
                user_id: user.id,
                role: 'OWNER',
            });

            expect(member.id).toBeDefined();
            expect(member.shop_id).toBe(shop.id);
            expect(member.user_id).toBe(user.id);
            expect(member.role).toBe('OWNER');
        });
    });

    describe('findByShopAndUserId', () => {
        it('should return member by shop and user id', async () => {
            await db.insert(usersTable).values(user);
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Member Shop' })
                .returning();

            await sut.create({
                shop_id: shop.id,
                user_id: user.id,
                role: 'MEMBER',
            });

            const found = await sut.findByShopAndUserId(shop.id, user.id);

            expect(found).not.toBeNull();
            expect(found?.shop_id).toBe(shop.id);
            expect(found?.user_id).toBe(user.id);
            expect(found?.role).toBe('MEMBER');
        });

        it('should return null if member does not exist', async () => {
            const found = await sut.findByShopAndUserId(
                crypto.randomUUID(),
                crypto.randomUUID(),
            );
            expect(found).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete member and return deleted member', async () => {
            await db.insert(usersTable).values(user);
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Member Shop' })
                .returning();

            await sut.create({
                shop_id: shop.id,
                user_id: user.id,
                role: 'MEMBER',
            });

            const deleted = await sut.delete(shop.id, user.id);
            expect(deleted.shop_id).toBe(shop.id);
            expect(deleted.user_id).toBe(user.id);

            const found = await sut.findByShopAndUserId(shop.id, user.id);
            expect(found).toBeNull();
        });

        it('should throw ShopMemberNotFoundError if member does not exist', async () => {
            await expect(
                sut.delete(crypto.randomUUID(), crypto.randomUUID()),
            ).rejects.toThrow(ShopMemberNotFoundError);
        });
    });
});

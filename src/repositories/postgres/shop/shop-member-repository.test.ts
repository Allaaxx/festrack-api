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

    describe('findByShopIdWithUsers', () => {
        it('should return shop members with user details', async () => {
            await db.insert(usersTable).values(user);
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Member Shop' })
                .returning();

            await sut.create({
                shop_id: shop.id,
                user_id: user.id,
                role: 'OWNER',
            });

            const members = await sut.findByShopIdWithUsers(shop.id);
            expect(members.length).toBe(1);
            expect(members[0].shop_id).toBe(shop.id);
            expect(members[0].user_id).toBe(user.id);
            expect(members[0].user.email).toBe(user.email);
            expect(members[0].user.first_name).toBe(user.first_name);
        });
    });

    describe('updateRole', () => {
        it('should update member role', async () => {
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

            const updated = await sut.updateRole(shop.id, user.id, 'OWNER');
            expect(updated.role).toBe('OWNER');

            const found = await sut.findByShopAndUserId(shop.id, user.id);
            expect(found?.role).toBe('OWNER');
        });

        it('should throw ShopMemberNotFoundError if member does not exist', async () => {
            await expect(
                sut.updateRole(
                    crypto.randomUUID(),
                    crypto.randomUUID(),
                    'OWNER',
                ),
            ).rejects.toThrow(ShopMemberNotFoundError);
        });
    });

    describe('countOwners', () => {
        it('should return the number of owners for a shop', async () => {
            await db.insert(usersTable).values(user);
            const [shop] = await db
                .insert(shopsTable)
                .values({ name: 'Member Shop' })
                .returning();

            expect(await sut.countOwners(shop.id)).toBe(0);

            await sut.create({
                shop_id: shop.id,
                user_id: user.id,
                role: 'OWNER',
            });

            expect(await sut.countOwners(shop.id)).toBe(1);
        });
    });
});

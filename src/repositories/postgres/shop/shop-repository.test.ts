import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { db } from '../../../db/postgres/index.js';
import {
    shopsTable,
    shopMembersTable,
    usersTable,
} from '../../../db/postgres/schemas/index.js';
import { shop, user } from '../../../tests/index.js';
import { PostgresShopRepository } from './shop-repository.js';
import { ShopNotFoundError } from '../../../errors/shop.js';

describe('Postgres Shop Repository', () => {
    let sut: PostgresShopRepository;

    beforeEach(() => {
        sut = new PostgresShopRepository();
    });

    describe('create', () => {
        it('should create a shop on db', async () => {
            const result = await sut.create({
                name: 'Bakery Co',
                description: 'Fresh bread',
            });

            expect(result.id).toBeDefined();
            expect(result.name).toBe('Bakery Co');
            expect(result.description).toBe('Fresh bread');
            expect(result.created_at).toBeDefined();
            expect(result.updated_at).toBeDefined();
        });

        it('should throw if database throws', async () => {
            const mockDb = {
                insert: mock(() => {
                    throw new Error('DB Error');
                }),
            };
            const repository = new PostgresShopRepository(mockDb as any);

            await expect(
                repository.create({ name: 'Bakery' }),
            ).rejects.toThrow();
        });
    });

    describe('findById', () => {
        it('should return shop by id', async () => {
            const [created] = await db
                .insert(shopsTable)
                .values({
                    id: shop.id,
                    name: shop.name,
                    description: shop.description,
                })
                .returning();

            const found = await sut.findById(created.id);

            expect(found).not.toBeNull();
            expect(found?.id).toBe(created.id);
            expect(found?.name).toBe(shop.name);
        });

        it('should return null if shop is not found', async () => {
            const found = await sut.findById(crypto.randomUUID());
            expect(found).toBeNull();
        });
    });

    describe('findByUserId', () => {
        it('should return shops for a user including role', async () => {
            await db.insert(usersTable).values(user);

            const [createdShop] = await db
                .insert(shopsTable)
                .values({
                    name: 'User Shop',
                    description: 'Testing',
                })
                .returning();

            await db.insert(shopMembersTable).values({
                shop_id: createdShop.id,
                user_id: user.id,
                role: 'OWNER',
            });

            const userShops = await sut.findByUserId(user.id);

            expect(userShops.length).toBeGreaterThanOrEqual(1);
            const found = userShops.find((s) => s.id === createdShop.id);
            expect(found).toBeDefined();
            expect(found?.role).toBe('OWNER');
            expect(found?.name).toBe('User Shop');
        });

        it('should return empty list if user has no shops', async () => {
            await db.insert(usersTable).values(user);
            const userShops = await sut.findByUserId(user.id);
            expect(userShops).toEqual([]);
        });
    });

    describe('update', () => {
        it('should update shop details', async () => {
            const [created] = await db
                .insert(shopsTable)
                .values({
                    name: 'Initial Name',
                    description: 'Initial Desc',
                })
                .returning();

            const updated = await sut.update(created.id, {
                name: 'Updated Name',
                description: 'Updated Desc',
            });

            expect(updated.name).toBe('Updated Name');
            expect(updated.description).toBe('Updated Desc');
        });

        it('should throw ShopNotFoundError if shop to update does not exist', async () => {
            await expect(
                sut.update(crypto.randomUUID(), { name: 'Non Existent' }),
            ).rejects.toThrow(ShopNotFoundError);
        });
    });

    describe('delete', () => {
        it('should delete shop from db and return deleted shop', async () => {
            const [created] = await db
                .insert(shopsTable)
                .values({
                    name: 'Delete Me',
                })
                .returning();

            const deleted = await sut.delete(created.id);
            expect(deleted.id).toBe(created.id);

            const found = await sut.findById(created.id);
            expect(found).toBeNull();
        });

        it('should throw ShopNotFoundError if shop to delete does not exist', async () => {
            await expect(sut.delete(crypto.randomUUID())).rejects.toThrow(
                ShopNotFoundError,
            );
        });
    });
});

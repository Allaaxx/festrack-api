import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { eq } from 'drizzle-orm';
import { faker } from '@faker-js/faker';
import { db } from '../../../db/postgres/index.js';
import { shopsTable } from '../../../db/postgres/schemas/index.js';
import { PostgresEventTagRepository } from './event-tag-repository.js';
import { EventTagNotFoundError } from '../../../errors/index.js';

describe('Postgres Event Tag Repository', () => {
    let sut: PostgresEventTagRepository;
    let shopId: string;

    beforeEach(async () => {
        sut = new PostgresEventTagRepository();
        shopId = faker.string.uuid();
        await db.insert(shopsTable).values({
            id: shopId,
            name: 'Event Tag Repo Test Shop',
            description: 'Test Description',
        });
    });

    afterEach(async () => {
        await db.delete(shopsTable).where(eq(shopsTable.id, shopId));
    });

    describe('create', () => {
        it('should create an event tag on db', async () => {
            const result = await sut.create({
                shop_id: shopId,
                name: 'Aniversário',
                slug: 'aniversario',
                color: 'bg-indigo-500',
            });

            expect(result.id).toBeDefined();
            expect(result.shop_id).toBe(shopId);
            expect(result.name).toBe('Aniversário');
            expect(result.slug).toBe('aniversario');
            expect(result.color).toBe('bg-indigo-500');
            expect('is_system' in result).toBe(false);
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should enforce unique (shop_id, slug) constraint', async () => {
            await sut.create({
                shop_id: shopId,
                name: 'Tag One',
                slug: 'same-slug',
                color: 'bg-red-500',
            });

            await expect(
                sut.create({
                    shop_id: shopId,
                    name: 'Tag Two',
                    slug: 'same-slug',
                    color: 'bg-green-500',
                }),
            ).rejects.toThrow();
        });
    });

    describe('findByShopId', () => {
        it('should return all event tags for a given shop', async () => {
            await sut.create({
                shop_id: shopId,
                name: 'Tag 1',
                slug: 'tag-1',
                color: 'bg-blue-500',
            });
            await sut.create({
                shop_id: shopId,
                name: 'Tag 2',
                slug: 'tag-2',
                color: 'bg-yellow-500',
            });

            const tags = await sut.findByShopId(shopId);

            expect(tags).toHaveLength(2);
            const slugs = tags.map((t) => t.slug);
            expect(slugs).toContain('tag-1');
            expect(slugs).toContain('tag-2');
        });

        it('should return empty array if shop has no custom event tags', async () => {
            const tags = await sut.findByShopId(shopId);

            expect(tags).toEqual([]);
        });

        it('should not return event tags from other shops (isolation)', async () => {
            const otherShopId = faker.string.uuid();
            await db.insert(shopsTable).values({
                id: otherShopId,
                name: 'Other Shop',
            });

            try {
                await sut.create({
                    shop_id: otherShopId,
                    name: 'Other Tag',
                    slug: 'other-tag',
                    color: 'bg-purple-500',
                });

                const tags = await sut.findByShopId(shopId);
                expect(tags).toHaveLength(0);
            } finally {
                await db
                    .delete(shopsTable)
                    .where(eq(shopsTable.id, otherShopId));
            }
        });
    });

    describe('findBySlug', () => {
        it('should return null when tag with given slug does not exist in shop', async () => {
            const tag = await sut.findBySlug(shopId, 'non-existent-slug');
            expect(tag).toBeNull();
        });

        it('should return the event tag when found by shopId and slug', async () => {
            const created = await sut.create({
                shop_id: shopId,
                name: 'Aniversário',
                slug: 'aniversario',
                color: 'bg-emerald-500',
            });

            const found = await sut.findBySlug(shopId, 'aniversario');

            expect(found).not.toBeNull();
            expect(found?.id).toBe(created.id);
            expect(found?.shop_id).toBe(shopId);
            expect(found?.name).toBe('Aniversário');
            expect(found?.slug).toBe('aniversario');
            expect(found?.color).toBe('bg-emerald-500');
            expect('is_system' in found!).toBe(false);
        });

        it('should enforce shop isolation and not find slug from another shop', async () => {
            const otherShopId = faker.string.uuid();
            await db.insert(shopsTable).values({
                id: otherShopId,
                name: 'Other Shop Slug',
            });

            try {
                await sut.create({
                    shop_id: otherShopId,
                    name: 'Other Shop Tag',
                    slug: 'isolated-slug',
                    color: 'bg-pink-500',
                });

                const foundInOriginalShop = await sut.findBySlug(
                    shopId,
                    'isolated-slug',
                );
                expect(foundInOriginalShop).toBeNull();

                const foundInOtherShop = await sut.findBySlug(
                    otherShopId,
                    'isolated-slug',
                );
                expect(foundInOtherShop).not.toBeNull();
                expect(foundInOtherShop?.shop_id).toBe(otherShopId);
            } finally {
                await db
                    .delete(shopsTable)
                    .where(eq(shopsTable.id, otherShopId));
            }
        });
    });

    describe('findById', () => {
        it('should return null when tag with given id does not exist in shop', async () => {
            const tag = await sut.findById('non-existent-id', shopId);
            expect(tag).toBeNull();
        });

        it('should return the event tag when found by id and shopId', async () => {
            const created = await sut.create({
                shop_id: shopId,
                name: 'VIP Tag',
                slug: 'vip-tag',
                color: 'bg-emerald-500',
            });

            const found = await sut.findById(created.id, shopId);

            expect(found).not.toBeNull();
            expect(found?.id).toBe(created.id);
            expect(found?.shop_id).toBe(shopId);
            expect(found?.name).toBe('VIP Tag');
            expect(found?.slug).toBe('vip-tag');
        });

        it('should enforce shop isolation and not find tag by id from another shop', async () => {
            const otherShopId = faker.string.uuid();
            await db.insert(shopsTable).values({
                id: otherShopId,
                name: 'Other Shop Id',
            });

            try {
                const created = await sut.create({
                    shop_id: otherShopId,
                    name: 'Other Shop Tag',
                    slug: 'other-slug',
                    color: 'bg-pink-500',
                });

                const foundInOriginalShop = await sut.findById(
                    created.id,
                    shopId,
                );
                expect(foundInOriginalShop).toBeNull();

                const foundInOtherShop = await sut.findById(
                    created.id,
                    otherShopId,
                );
                expect(foundInOtherShop).not.toBeNull();
                expect(foundInOtherShop?.shop_id).toBe(otherShopId);
            } finally {
                await db
                    .delete(shopsTable)
                    .where(eq(shopsTable.id, otherShopId));
            }
        });
    });

    describe('delete', () => {
        it('should delete event tag by id and shopId and return deleted tag', async () => {
            const created = await sut.create({
                shop_id: shopId,
                name: 'Tag To Delete',
                slug: 'tag-to-delete',
                color: 'bg-red-500',
            });

            const deleted = await sut.delete(created.id, shopId);

            expect(deleted.id).toBe(created.id);
            expect(deleted.slug).toBe('tag-to-delete');

            const found = await sut.findById(created.id, shopId);
            expect(found).toBeNull();
        });

        it('should throw EventTagNotFoundError when deleting non-existent tag', async () => {
            await expect(sut.delete('non-existent-id', shopId)).rejects.toThrow(
                new EventTagNotFoundError('non-existent-id'),
            );
        });

        it('should not delete tag from another shop (enforce isolation)', async () => {
            const otherShopId = faker.string.uuid();
            await db.insert(shopsTable).values({
                id: otherShopId,
                name: 'Other Shop Isolation',
            });

            try {
                const created = await sut.create({
                    shop_id: otherShopId,
                    name: 'Other Tag',
                    slug: 'other-tag-slug',
                    color: 'bg-yellow-500',
                });

                await expect(sut.delete(created.id, shopId)).rejects.toThrow(
                    new EventTagNotFoundError(created.id),
                );

                const stillExists = await sut.findById(created.id, otherShopId);
                expect(stillExists).not.toBeNull();
            } finally {
                await db
                    .delete(shopsTable)
                    .where(eq(shopsTable.id, otherShopId));
            }
        });
    });
});

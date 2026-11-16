import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { eq } from 'drizzle-orm';
import { faker } from '@faker-js/faker';
import { db } from '../../../db/postgres/index.js';
import { shopsTable } from '../../../db/postgres/schemas/index.js';
import { PostgresEventTagRepository } from './event-tag-repository.js';

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
            expect(result.is_system).toBe(false);
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
});

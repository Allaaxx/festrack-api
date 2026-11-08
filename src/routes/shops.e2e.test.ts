import { describe, it, expect, spyOn } from 'bun:test';
import sharp from 'sharp';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { S3StorageService } from '../adapters/index.js';
import { db } from '../db/postgres/index.js';
import { shopMembersTable } from '../db/postgres/schemas/index.js';

describe('Shops Routes (Elysia E2E)', () => {
    const client = testClient(app);

    describe('POST /api/shops', () => {
        it('should return 201 and create a shop with role OWNER for the creator', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Test Coffee Roasters',
                    description: 'Artisanal coffee and pastries',
                });

            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Test Coffee Roasters');
            expect(response.body.description).toBe(
                'Artisanal coffee and pastries',
            );
            expect(response.body.id).toBeDefined();
            expect(response.body.role).toBe('OWNER');
            expect(response.body.created_at).toBeDefined();
            expect(response.body.updated_at).toBeDefined();
        });

        it('should allow creating a shop with optional description omitted', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Minimal Shop',
                });

            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Minimal Shop');
            expect(response.body.description).toBeNull();
            expect(response.body.role).toBe('OWNER');
        });

        it('should return 401 when unauthorized', async () => {
            const response = await client.post('/api/shops').send({
                name: 'Unauthorized Shop',
            });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return 400 when name is empty', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: '',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/shops', () => {
        it('should list all shops the authenticated user belongs to including their role', async () => {
            const user = await createAuthenticatedUser(client);

            const shop1Res = await client
                .post('/api/shops')
                .set('Authorization', user.bearerHeader)
                .send({ name: 'Shop One' });
            expect(shop1Res.status).toBe(201);

            const shop2Res = await client
                .post('/api/shops')
                .set('Authorization', user.bearerHeader)
                .send({ name: 'Shop Two' });
            expect(shop2Res.status).toBe(201);

            const listRes = await client
                .get('/api/shops')
                .set('Authorization', user.bearerHeader);

            expect(listRes.status).toBe(200);
            expect(Array.isArray(listRes.body)).toBe(true);
            expect(listRes.body.length).toBeGreaterThanOrEqual(2);

            const foundShop1 = listRes.body.find(
                (s: any) => s.id === shop1Res.body.id,
            );
            expect(foundShop1).toBeDefined();
            expect(foundShop1.name).toBe('Shop One');
            expect(foundShop1.role).toBe('OWNER');

            const foundShop2 = listRes.body.find(
                (s: any) => s.id === shop2Res.body.id,
            );
            expect(foundShop2).toBeDefined();
            expect(foundShop2.name).toBe('Shop Two');
            expect(foundShop2.role).toBe('OWNER');
        });

        it('should return empty array if user belongs to no shops', async () => {
            const newUser = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/shops')
                .set('Authorization', newUser.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should return 401 when unauthorized', async () => {
            const response = await client.get('/api/shops');
            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });
    });

    describe('GET /api/shops/:shopId', () => {
        it('should return shop details for an active OWNER', async () => {
            const owner = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Coffee Lab',
                    description: 'Specialty espresso',
                });

            const shopId = createRes.body.id;

            const getRes = await client
                .get(`/api/shops/${shopId}`)
                .set('Authorization', owner.bearerHeader);

            expect(getRes.status).toBe(200);
            expect(getRes.body.id).toBe(shopId);
            expect(getRes.body.name).toBe('Coffee Lab');
            expect(getRes.body.description).toBe('Specialty espresso');
        });

        it('should return shop details for an active MEMBER', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Shared Roastery' });

            const shopId = createRes.body.id;

            await db.insert(shopMembersTable).values({
                shop_id: shopId,
                user_id: memberUser.user.id,
                role: 'MEMBER',
            });

            const getRes = await client
                .get(`/api/shops/${shopId}`)
                .set('Authorization', memberUser.bearerHeader);

            expect(getRes.status).toBe(200);
            expect(getRes.body.id).toBe(shopId);
            expect(getRes.body.name).toBe('Shared Roastery');
        });

        it('should return 404 when shop does not exist', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentId = crypto.randomUUID();

            const response = await client
                .get(`/api/shops/${nonExistentId}`)
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(404);
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const otherUser = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Private Shop' });

            const shopId = createRes.body.id;

            const response = await client
                .get(`/api/shops/${shopId}`)
                .set('Authorization', otherUser.bearerHeader);

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 400 when shopId is not a valid UUID', async () => {
            const user = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/shops/invalid-uuid')
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(400);
        });
    });

    describe('PATCH /api/shops/:shopId', () => {
        it('should allow OWNER to update shop metadata', async () => {
            const owner = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Old Shop Name',
                    description: 'Old Description',
                });

            const shopId = createRes.body.id;

            const patchRes = await client
                .patch(`/api/shops/${shopId}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Updated Shop Name',
                    description: 'Updated Description',
                });

            expect(patchRes.status).toBe(200);
            expect(patchRes.body.id).toBe(shopId);
            expect(patchRes.body.name).toBe('Updated Shop Name');
            expect(patchRes.body.description).toBe('Updated Description');
        });

        it('should return 403 Forbidden when MEMBER role tries to update shop metadata', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Owner Controlled Shop' });

            const shopId = createRes.body.id;

            await db.insert(shopMembersTable).values({
                shop_id: shopId,
                user_id: memberUser.user.id,
                role: 'MEMBER',
            });

            const patchRes = await client
                .patch(`/api/shops/${shopId}`)
                .set('Authorization', memberUser.bearerHeader)
                .send({ name: 'Member Attempted Name' });

            expect(patchRes.status).toBe(403);
            expect(patchRes.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 403 when non-member tries to update shop metadata', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Owner Shop' });

            const shopId = createRes.body.id;

            const patchRes = await client
                .patch(`/api/shops/${shopId}`)
                .set('Authorization', nonMember.bearerHeader)
                .send({ name: 'Hacked Shop' });

            expect(patchRes.status).toBe(403);
            expect(patchRes.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 404 when updating non-existent shop', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentId = crypto.randomUUID();

            const response = await client
                .patch(`/api/shops/${nonExistentId}`)
                .set('Authorization', user.bearerHeader)
                .send({ name: 'Does Not Exist' });

            expect(response.status).toBe(404);
        });

        it('should return 400 when updating with invalid UUID', async () => {
            const user = await createAuthenticatedUser(client);

            const response = await client
                .patch('/api/shops/not-a-uuid')
                .set('Authorization', user.bearerHeader)
                .send({ name: 'Invalid' });

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/shops/:shopId', () => {
        it('should allow OWNER to delete the shop and cascade member removal', async () => {
            const owner = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Shop To Delete' });

            const shopId = createRes.body.id;

            const deleteRes = await client
                .delete(`/api/shops/${shopId}`)
                .set('Authorization', owner.bearerHeader);

            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.id).toBe(shopId);

            // Fetching deleted shop should now return 404
            const getRes = await client
                .get(`/api/shops/${shopId}`)
                .set('Authorization', owner.bearerHeader);

            expect(getRes.status).toBe(404);
        });

        it('should return 403 Forbidden when MEMBER role tries to delete shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Owner Delete Shop' });

            const shopId = createRes.body.id;

            await db.insert(shopMembersTable).values({
                shop_id: shopId,
                user_id: memberUser.user.id,
                role: 'MEMBER',
            });

            const deleteRes = await client
                .delete(`/api/shops/${shopId}`)
                .set('Authorization', memberUser.bearerHeader);

            expect(deleteRes.status).toBe(403);
            expect(deleteRes.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 403 when non-member tries to delete shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Protected Shop' });

            const shopId = createRes.body.id;

            const deleteRes = await client
                .delete(`/api/shops/${shopId}`)
                .set('Authorization', nonMember.bearerHeader);

            expect(deleteRes.status).toBe(403);
            expect(deleteRes.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 404 when deleting non-existent shop', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentId = crypto.randomUUID();

            const response = await client
                .delete(`/api/shops/${nonExistentId}`)
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(404);
        });

        it('should return 400 when delete called with invalid UUID', async () => {
            const user = await createAuthenticatedUser(client);

            const response = await client
                .delete('/api/shops/not-a-uuid')
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/shops/:shopId/uploads', () => {
        const VALID_PNG_BYTES = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
        );

        it('should return 201 and upload image to root folder when folder is omitted', async () => {
            const uploadSpy = spyOn(
                S3StorageService.prototype,
                'upload',
            ).mockImplementation(async ({ fileName }) => {
                return `https://storage.example.com/${fileName}`;
            });

            const owner = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Asset Upload Root Shop' });
            expect(shopRes.status).toBe(201);
            const shopId = shopRes.body.id;

            const formData = new FormData();
            formData.append(
                'file',
                new Blob([VALID_PNG_BYTES], { type: 'image/png' }),
                'logo.png',
            );

            const response = await client
                .post(`/api/shops/${shopId}/uploads`)
                .set('Authorization', owner.bearerHeader)
                .send(formData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('url');
            expect(response.body.url).toBe(
                `https://storage.example.com/${response.body.key}`,
            );
            expect(response.body.key).toMatch(
                new RegExp(`^shops/${shopId}/[a-f0-9-]+\\.webp$`),
            );
            expect(response.body.content_type).toBe('image/webp');
            expect(typeof response.body.size).toBe('number');
            expect(response.body.size).toBeGreaterThan(0);

            uploadSpy.mockRestore();
        });

        it('should return 201 and upload image to partitioned folder when folder is specified', async () => {
            const uploadSpy = spyOn(
                S3StorageService.prototype,
                'upload',
            ).mockImplementation(async ({ fileName }) => {
                return `https://storage.example.com/${fileName}`;
            });

            const owner = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Asset Upload Partitioned Shop' });
            expect(shopRes.status).toBe(201);
            const shopId = shopRes.body.id;

            for (const folder of ['general', 'products', 'receipts'] as const) {
                const formData = new FormData();
                formData.append(
                    'file',
                    new Blob([VALID_PNG_BYTES], { type: 'image/png' }),
                    `${folder}.png`,
                );
                formData.append('folder', folder);

                const response = await client
                    .post(`/api/shops/${shopId}/uploads`)
                    .set('Authorization', owner.bearerHeader)
                    .send(formData);

                expect(response.status).toBe(201);
                expect(response.body.key).toMatch(
                    new RegExp(`^shops/${shopId}/${folder}/[a-f0-9-]+\\.webp$`),
                );
                expect(response.body.url).toBe(
                    `https://storage.example.com/${response.body.key}`,
                );
                expect(response.body.content_type).toBe('image/webp');
            }

            uploadSpy.mockRestore();
        });

        it('should downscale images wider than 2048px (2500x1000) down to 2048px WebP upon upload preserving aspect ratio without enlargement', async () => {
            let uploadedBuffer: Buffer | null = null;
            const uploadSpy = spyOn(
                S3StorageService.prototype,
                'upload',
            ).mockImplementation(async ({ fileName, data }) => {
                uploadedBuffer = data as Buffer;
                return `https://storage.example.com/${fileName}`;
            });

            const owner = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Downscaling Shop' });
            expect(shopRes.status).toBe(201);
            const shopId = shopRes.body.id;

            const wideImageBuffer = await sharp({
                create: {
                    width: 2500,
                    height: 1000,
                    channels: 3,
                    background: { r: 10, g: 20, b: 30 },
                },
            })
                .jpeg()
                .toBuffer();

            const formData = new FormData();
            formData.append(
                'file',
                new Blob([wideImageBuffer], { type: 'image/jpeg' }),
                'wide-banner.jpg',
            );
            formData.append('folder', 'general');

            const response = await client
                .post(`/api/shops/${shopId}/uploads`)
                .set('Authorization', owner.bearerHeader)
                .send(formData);

            expect(response.status).toBe(201);
            expect(uploadedBuffer).not.toBeNull();

            const metadata = await sharp(uploadedBuffer!).metadata();
            expect(metadata.format).toBe('webp');
            expect(metadata.width).toBe(2048);
            expect(metadata.height).toBe(819);

            uploadSpy.mockRestore();
        });

        it('should return 400 when invalid folder value is passed', async () => {
            const owner = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Invalid Folder Shop' });
            expect(shopRes.status).toBe(201);
            const shopId = shopRes.body.id;

            for (const invalidFolder of [
                'invalid_folder',
                '../traversal',
                'secret',
            ]) {
                const formData = new FormData();
                formData.append(
                    'file',
                    new Blob([VALID_PNG_BYTES], { type: 'image/png' }),
                    'test.png',
                );
                formData.append('folder', invalidFolder);

                const response = await client
                    .post(`/api/shops/${shopId}/uploads`)
                    .set('Authorization', owner.bearerHeader)
                    .send(formData);

                expect(response.status).toBe(400);
            }
        });

        it('should return 400 when file format is not allowed (application/pdf, text/plain, image/svg+xml)', async () => {
            const owner = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Format Test Shop' });
            expect(shopRes.status).toBe(201);
            const shopId = shopRes.body.id;

            const unsupportedCases = [
                {
                    content: 'not an image content',
                    type: 'text/plain',
                    name: 'test.txt',
                },
                {
                    content: '%PDF-1.4 mock content',
                    type: 'application/pdf',
                    name: 'document.pdf',
                },
                {
                    content: '<svg></svg>',
                    type: 'image/svg+xml',
                    name: 'vector.svg',
                },
            ];

            for (const { content, type, name } of unsupportedCases) {
                const formData = new FormData();
                formData.append('file', new Blob([content], { type }), name);

                const response = await client
                    .post(`/api/shops/${shopId}/uploads`)
                    .set('Authorization', owner.bearerHeader)
                    .send(formData);

                expect(response.status).toBe(400);
            }
        });

        it('should return 400 when file size exceeds 10MB', async () => {
            const owner = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Oversized Asset Shop' });
            expect(shopRes.status).toBe(201);
            const shopId = shopRes.body.id;

            // 10MB + 1KB
            const oversizedBytes = new Uint8Array(10 * 1024 * 1024 + 1024);
            const formData = new FormData();
            formData.append(
                'file',
                new Blob([oversizedBytes], { type: 'image/png' }),
                'huge.png',
            );

            const response = await client
                .post(`/api/shops/${shopId}/uploads`)
                .set('Authorization', owner.bearerHeader)
                .send(formData);

            expect(response.status).toBe(400);
        });

        it('should return 401 when request is not authenticated', async () => {
            const validUuid = crypto.randomUUID();
            const formData = new FormData();
            formData.append(
                'file',
                new Blob([VALID_PNG_BYTES], { type: 'image/png' }),
                'logo.png',
            );

            const response = await client
                .post(`/api/shops/${validUuid}/uploads`)
                .send(formData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return 403 when authenticated user is not a member of the target shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const outsider = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Private Shop' });
            expect(shopRes.status).toBe(201);
            const shopId = shopRes.body.id;

            const formData = new FormData();
            formData.append(
                'file',
                new Blob([VALID_PNG_BYTES], { type: 'image/png' }),
                'logo.png',
            );

            const response = await client
                .post(`/api/shops/${shopId}/uploads`)
                .set('Authorization', outsider.bearerHeader)
                .send(formData);

            expect(response.status).toBe(403);
            expect(response.body.message).toBeDefined();
        });

        it('should return 404 when shop does not exist', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentShopId = crypto.randomUUID();

            const formData = new FormData();
            formData.append(
                'file',
                new Blob([VALID_PNG_BYTES], { type: 'image/png' }),
                'logo.png',
            );

            const response = await client
                .post(`/api/shops/${nonExistentShopId}/uploads`)
                .set('Authorization', user.bearerHeader)
                .send(formData);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ message: 'Shop not found.' });
        });

        it('should return 400 when shopId is not a valid UUID', async () => {
            const user = await createAuthenticatedUser(client);

            const formData = new FormData();
            formData.append(
                'file',
                new Blob([VALID_PNG_BYTES], { type: 'image/png' }),
                'logo.png',
            );

            const response = await client
                .post('/api/shops/not-a-valid-uuid/uploads')
                .set('Authorization', user.bearerHeader)
                .send(formData);

            expect(response.status).toBe(400);
        });
    });
});

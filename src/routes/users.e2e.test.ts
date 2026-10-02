import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { user } from '../tests/index.js';

describe('Users Routes (Elysia E2E)', () => {
    const client = testClient(app);

    it('GET /api/users/me should return 200 if user is authenticated', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .get('/api/users/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdUser.id);
        expect(response.body.email).toBe(createdUser.email);
    });

    it('GET /api/users/me should return 401 when user is not authenticated', async () => {
        const response = await client.get('/api/users/me');
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('PATCH /api/users/me should return 200 when user is updated', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .patch('/api/users/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                first_name: 'Updated',
                last_name: 'Name',
            });

        expect(response.status).toBe(200);
        expect(response.body.first_name).toBe('Updated');
        expect(response.body.last_name).toBe('Name');
    });

    it('PATCH /api/users/me should return 400 when email is already in use', async () => {
        const userA = {
            first_name: 'User',
            last_name: 'A',
            email: `usera_${Date.now()}@example.com`,
            password: 'password123',
        };
        const userB = {
            first_name: 'User',
            last_name: 'B',
            email: `userb_${Date.now()}@example.com`,
            password: 'password123',
        };

        await client.post('/api/auth').send(userA);
        const { body: createdUserB } = await client
            .post('/api/auth')
            .send(userB);

        const response = await client
            .patch('/api/users/me')
            .set('Authorization', `Bearer ${createdUserB.tokens.accessToken}`)
            .send({
                email: userA.email,
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('already in use');
    });

    it('PATCH /api/users/me should return 400 when body has unexpected properties', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .patch('/api/users/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                phone: '1234567890',
            });

        expect(response.status).toBe(400);
    });

    it('DELETE /api/users/me should return 200 when user is deleted', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .delete('/api/users/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdUser.id);
    });

    it('GET /api/users/me/balance should return 200 when user balance is calculated', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .get('/api/users/me/balance?from=2026-01-01&to=2026-12-31')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('earnings');
        expect(response.body).toHaveProperty('expenses');
        expect(response.body).toHaveProperty('investments');
        expect(response.body).toHaveProperty('balance');
    });

    it('GET /api/users/me/balance should return 400 when query dates are invalid', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .get('/api/users/me/balance?from=invalid-date&to=2026-12-31')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(400);
    });
});

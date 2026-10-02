import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { user } from '../tests/index.js';

describe('Auth Route (Elysia E2E)', () => {
    const client = testClient(app);

    it('POST /api/auth should return 201 when user is created', async () => {
        const uniqueEmail = `test_e2e_${Date.now()}@example.com`;
        const response = await client.post('/api/auth').send({
            first_name: 'John',
            last_name: 'Doe',
            email: uniqueEmail,
            password: 'password123',
        });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(uniqueEmail);
        expect(response.body).toHaveProperty('tokens');
        expect(response.body.tokens).toHaveProperty('accessToken');
        expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('POST /api/auth should return 400 when email already in use', async () => {
        const uniqueEmail = `test_dup_${Date.now()}@example.com`;
        await client.post('/api/auth').send({
            first_name: 'John',
            last_name: 'Doe',
            email: uniqueEmail,
            password: 'password123',
        });

        const response = await client.post('/api/auth').send({
            first_name: 'Jane',
            last_name: 'Doe',
            email: uniqueEmail,
            password: 'password123',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: `The e-mail ${uniqueEmail} is already in use`,
        });
    });

    it('POST /api/auth should return 400 when first_name is missing', async () => {
        const response = await client.post('/api/auth').send({
            last_name: 'Doe',
            email: 'missing_name@example.com',
            password: 'password123',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'First name is required.',
        });
    });

    it('POST /api/auth/login should return 200 when user is logged in', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client.post('/api/auth/login').send({
            email: user.email,
            password: user.password,
        });

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdUser.id);
        expect(response.body).toHaveProperty('tokens');
        expect(response.body.tokens).toHaveProperty('accessToken');
        expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('POST /api/auth/login should return 404 when user is not found', async () => {
        const response = await client.post('/api/auth/login').send({
            email: 'nonexistent@example.com',
            password: 'password123',
        });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            message: 'User not found',
        });
    });

    it('POST /api/auth/login should return 401 when password is wrong', async () => {
        await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client.post('/api/auth/login').send({
            email: user.email,
            password: 'wrongpassword',
        });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: 'Unauthorized',
        });
    });

    it('POST /api/auth/refresh-token should return 200 when refresh token is valid', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client.post('/api/auth/refresh-token').send({
            refreshToken: createdUser.tokens.refreshToken,
        });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('tokens');
        expect(response.body.tokens).toHaveProperty('accessToken');
        expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('POST /api/auth/refresh-token should return 401 when refresh token is invalid', async () => {
        const response = await client.post('/api/auth/refresh-token').send({
            refreshToken: 'invalid.token.here',
        });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: 'Unauthorized',
        });
    });
});

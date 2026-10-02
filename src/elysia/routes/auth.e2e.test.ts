import { describe, it, expect } from 'bun:test';
import { elysiaApp, testClient } from '../index.js';
import { user } from '../../tests/fixtures/user.js';
import { faker } from '@faker-js/faker';

describe('Auth Route (Elysia E2E)', () => {
    const client = testClient(elysiaApp);

    it('POST /api/auth should return 201 when user is created', async () => {
        const response = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.tokens.accessToken).toBeDefined();
        expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('POST /api/auth should return 400 when email already in use', async () => {
        const testUser = {
            ...user,
            email: faker.internet.email(),
            id: undefined,
        };

        const firstResponse = await client.post('/api/auth').send(testUser);
        expect(firstResponse.status).toBe(201);

        const response = await client.post('/api/auth').send(testUser);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            `The e-mail ${testUser.email} is already in use`,
        );
    });

    it('POST /api/auth should return 400 when first_name is missing', async () => {
        const response = await client.post('/api/auth').send({
            ...user,
            first_name: '',
            email: faker.internet.email(),
            id: undefined,
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('First name is required.');
    });

    it('POST /api/auth/login should return 200 when user is logged in', async () => {
        const testUser = {
            ...user,
            email: faker.internet.email(),
            id: undefined,
        };

        const { body: createdUser } = await client
            .post('/api/auth')
            .send(testUser);

        const response = await client.post('/api/auth/login').send({
            email: createdUser.email,
            password: user.password,
        });

        expect(response.status).toBe(200);
        expect(response.body.tokens.accessToken).toBeDefined();
        expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('POST /api/auth/login should return 404 when user is not found', async () => {
        const response = await client.post('/api/auth/login').send({
            email: faker.internet.email(),
            password: faker.internet.password(),
        });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('POST /api/auth/login should return 401 when password is wrong', async () => {
        const testUser = {
            ...user,
            email: faker.internet.email(),
            id: undefined,
        };

        const { body: createdUser } = await client
            .post('/api/auth')
            .send(testUser);

        const response = await client.post('/api/auth/login').send({
            email: createdUser.email,
            password: faker.internet.password(),
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('POST /api/auth/refresh-token should return 200 when refresh token is valid', async () => {
        const testUser = {
            ...user,
            email: faker.internet.email(),
            id: undefined,
        };

        const { body: createdUser } = await client
            .post('/api/auth')
            .send(testUser);

        const response = await client.post('/api/auth/refresh-token').send({
            refreshToken: createdUser.tokens.refreshToken,
        });

        expect(response.status).toBe(200);
        expect(response.body.tokens.accessToken).toBeDefined();
        expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('POST /api/auth/refresh-token should return 401 when refresh token is invalid', async () => {
        const response = await client.post('/api/auth/refresh-token').send({
            refreshToken: 'invalid-refresh-token',
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });
});

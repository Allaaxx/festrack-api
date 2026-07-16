import request from 'supertest';
import { app } from '../app.js';
import { user } from '../tests/fixtures/user.js';
import { faker } from '@faker-js/faker';

describe('Auth Route', () => {
    it('POST /api/auth should return 201 when user is created', async () => {
        const response = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        expect(response.status).toBe(201);
    });

    it('POST /api/auth should return 400 when email already in use', async () => {
        await request(app)
            .post(`/api/auth`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .post(`/api/auth`)
            .send({
                ...user,
                id: undefined,
            });

        expect(response.status).toBe(400);
    });

    it('POST /api/auth/login should return 200 when user is logged in', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/auth`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app).post('/api/auth/login').send({
            email: createdUser.email,
            password: user.password,
        });

        expect(response.status).toBe(200);
        expect(response.body.tokens.accessToken).toBeDefined();
        expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('POST /api/auth/login should return 404 when user is not found', async () => {
        const response = await request(app).post('/api/auth/login').send({
            email: faker.internet.email(),
            password: faker.internet.password(),
        });

        expect(response.status).toBe(404);
    });

    it('POST /api/auth/login should return 401 when password is wrong', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/auth`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app).post('/api/auth/login').send({
            email: createdUser.email,
            password: faker.internet.password(),
        });

        expect(response.status).toBe(401);
    });

    it('POST /api/users/refresh-token should return 200 when refresh token is valid', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/auth`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .post('/api/auth/refresh-token')
            .send({
                refreshToken: createdUser.tokens.refreshToken,
            });

        expect(response.status).toBe(200);
        expect(response.body.tokens.accessToken).toBeDefined();
        expect(response.body.tokens.refreshToken).toBeDefined();
    });
});

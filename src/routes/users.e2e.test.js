import request from 'supertest';
import { app } from '../app.js';
import { user } from '../tests/fixtures/user.js';
import { faker } from '@faker-js/faker';
import { TransactionType } from '@prisma/client';

describe('Users Routes E2E Tests', () => {
    const from = '2020-01-01';
    const to = '2027-12-31';

    it('POST /users should return 201 when user is created', async () => {
        const response = await request(app)
            .post('/api/users')
            .send({
                ...user,
                id: undefined,
            });

        expect(response.status).toBe(201);
    });

    it('GET /api/users should return 200 when user is found', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .get(`/api/users`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdUser.id);
    });

    it('PATCH /api/users should return 200 when user is updated', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const updateUserParams = {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
            email: faker.internet.email(),
            password: faker.internet.password(),
        };

        const response = await request(app)
            .patch(`/api/users`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send(updateUserParams);

        expect(response.status).toBe(200);
        expect(response.body.first_name).toBe(updateUserParams.first_name);
        expect(response.body.last_name).toBe(updateUserParams.last_name);
        expect(response.body.email).toBe(updateUserParams.email);
        expect(response.body.password).not.toBe(updateUserParams.password);
    });

    it('DELETE /api/users should return 204 when user is deleted', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .delete(`/api/users`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdUser.id);
    });

    it('GET /api/users/balance should return 200 when user balance is calculated', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                user_id: createdUser.id,
                name: faker.commerce.productName(10),
                date: new Date(from),
                type: TransactionType.EARNING,
                amount: 10000,
            });

        await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                user_id: createdUser.id,
                name: faker.commerce.productName(10),
                date: new Date(from),
                type: TransactionType.EXPENSE,
                amount: 2000,
            });

        await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                user_id: createdUser.id,
                name: faker.commerce.productName(10),
                date: new Date(to),
                type: TransactionType.INVESTMENT,
                amount: 2000,
            });

        const response = await request(app)
            .get(`/api/users/balance`)
            .query({
                from: from,
                to: to,
            })
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            earnings: '10000',
            earningsPercentage: '71',
            expensePercentage: '14',
            expenses: '2000',
            investments: '2000',
            investmentsPercentage: '14',
            balance: '6000',
        });
    });

    it('POST /api/users should return 400 when email already in use', async () => {
        await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        expect(response.status).toBe(400);
    });

    it('PATCH /api/users should return 400 when email already in use', async () => {
        const { body: createdUserOne } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
                email: faker.internet.email(),
            });

        const { body: createdUserTwo } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
                email: faker.internet.email(),
            });

        const response = await request(app)
            .patch(`/api/users`)
            .set('Authorization', `Bearer ${createdUserOne.tokens.accessToken}`)
            .send({
                email: createdUserTwo.email,
            });
        expect(response.status).toBe(400);
    });

    it('PATCH /api/users should return 400 when body is invalid', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .patch(`/api/users`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                first_name: faker.person.firstName(),
                last_name: faker.person.lastName(),
                email: faker.internet.email(),
                password: faker.internet.password(),
                phone: faker.phone.number(),
            });

        expect(response.status).toBe(400);
    });

    it('POST /api/users/login should return 200 when user is logged in', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app).post('/api/users/login').send({
            email: createdUser.email,
            password: user.password,
        });

        expect(response.status).toBe(200);
        expect(response.body.tokens.accessToken).toBeDefined();
        expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('POST /api/users/login should return 404 when user is not found', async () => {
        const response = await request(app).post('/api/users/login').send({
            email: faker.internet.email(),
            password: faker.internet.password(),
        });

        expect(response.status).toBe(404);
    });

    it('POST /api/users/login should return 401 when password is wrong', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app).post('/api/users/login').send({
            email: createdUser.email,
            password: faker.internet.password(),
        });

        expect(response.status).toBe(401);
    });

    it('POST /api/users/refresh-token should return 200 when refresh token is valid', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .post('/api/users/refresh-token')
            .send({
                refreshToken: createdUser.tokens.refreshToken,
            });

        expect(response.status).toBe(200);
        expect(response.body.tokens.accessToken).toBeDefined();
        expect(response.body.tokens.refreshToken).toBeDefined();
    });
});

import { describe, it, expect } from 'bun:test';
import { elysiaApp, testClient } from '../index.js';
import { event, user } from '../../tests/index.js';
import { faker } from '@faker-js/faker';

describe('Events Routes (Elysia E2E)', () => {
    const client = testClient(elysiaApp);

    it('POST /api/events/me should return 201 when creating an event successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const response = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(event.name);
        expect(response.body.description).toBe(event.description);
        expect(response.body.user_id).toBe(createdUser.id);
    });

    it('POST /api/events/me should return 401 when unauthorized', async () => {
        const response = await client.post('/api/events/me').send({
            ...event,
            id: undefined,
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('POST /api/events/me should return 400 when invalid body', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const response = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
                name: '',
            });

        expect(response.status).toBe(400);
    });

    it('POST /api/events/me should return 400 when end_date is before start_date', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const response = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
                start_date: '2025-05-10',
                end_date: '2025-05-01',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            'End date must be greater than or equal to start date.',
        );
    });

    it('GET /api/events/me should return 200 with user events', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].name).toBe(event.name);
    });

    it('GET /api/events/me should return 401 when unauthorized', async () => {
        const response = await client.get('/api/events/me');
        expect(response.status).toBe(401);
    });

    it('GET /api/events/me/:eventId should return 200 when fetching event by id', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdEvent.id);
        expect(response.body.name).toBe(event.name);
    });

    it('GET /api/events/me/:eventId should return 400 when eventId is invalid UUID', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const response = await client
            .get('/api/events/me/not-a-valid-uuid')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('The provided id is not valid.');
    });

    it('GET /api/events/me/:eventId should return 404 when event does not exist', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const nonExistentId = faker.string.uuid();
        const response = await client
            .get(`/api/events/me/${nonExistentId}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Event not found.');
    });

    it('GET /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const { body: user1 } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const { body: user2 } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const { body: eventUser1 } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${user1.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get(`/api/events/me/${eventUser1.id}`)
            .set('Authorization', `Bearer ${user2.tokens.accessToken}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden');
    });

    it('PATCH /api/events/me/:eventId should return 200 when updating event successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .patch(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                name: 'Updated Name',
            });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Name');
    });

    it('PATCH /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const { body: user1 } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const { body: user2 } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const { body: eventUser1 } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${user1.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .patch(`/api/events/me/${eventUser1.id}`)
            .set('Authorization', `Bearer ${user2.tokens.accessToken}`)
            .send({
                name: 'Hacked Name',
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden');
    });

    it('DELETE /api/events/me/:eventId should return 200 when deleting event successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .delete(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdEvent.id);
    });

    it('DELETE /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const { body: user1 } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const { body: user2 } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const { body: eventUser1 } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${user1.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .delete(`/api/events/me/${eventUser1.id}`)
            .set('Authorization', `Bearer ${user2.tokens.accessToken}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden');
    });
});

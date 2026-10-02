import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { event } from '../tests/index.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';

describe('Events Routes (Elysia E2E)', () => {
    const client = testClient(app);

    it('POST /api/events/me should return 201 when creating an event successfully with Bearer token', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(event.name);
        expect(response.body.user_id).toBe(authUser.user.id);
    });

    it('POST /api/events/me should return 201 when creating an event with Cookie', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/events/me')
            .set('Cookie', authUser.cookieHeader)
            .send({
                ...event,
                id: undefined,
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(event.name);
        expect(response.body.user_id).toBe(authUser.user.id);
    });

    it('POST /api/events/me should return 401 when unauthorized', async () => {
        const response = await client.post('/api/events/me').send({
            ...event,
            id: undefined,
        });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('POST /api/events/me should return 401 when token is invalid', async () => {
        const response = await client
            .post('/api/events/me')
            .set('Authorization', 'Bearer invalid_token')
            .send({
                ...event,
                id: undefined,
            });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('POST /api/events/me should return 400 when invalid body', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
                name: '',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Name is required.');
    });

    it('POST /api/events/me should return 400 when end_date is before start_date', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
                start_date: '2026-05-10',
                end_date: '2026-05-01',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            'End date must be greater than or equal to start date.',
        );
    });

    it('GET /api/events/me should return 200 with user events using Bearer token', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get('/api/events/me')
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].id).toBe(createdEvent.id);
    });

    it('GET /api/events/me should return 200 with user events using Cookie', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Cookie', authUser.cookieHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get('/api/events/me')
            .set('Cookie', authUser.cookieHeader);

        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].id).toBe(createdEvent.id);
    });

    it('GET /api/events/me should return 401 when unauthorized', async () => {
        const response = await client.get('/api/events/me');
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('GET /api/events/me/:eventId should return 200 when fetching event by id', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdEvent.id);
    });

    it('GET /api/events/me/:eventId should return 400 when eventId is invalid UUID', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .get('/api/events/me/not-a-valid-uuid')
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'The provided id is not valid.',
        });
    });

    it('GET /api/events/me/:eventId should return 404 when event does not exist', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .get(`/api/events/me/${crypto.randomUUID()}`)
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Event not found.' });
    });

    it('GET /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const userA = await createAuthenticatedUser(client);
        const userB = await createAuthenticatedUser(client);

        const { body: eventA } = await client
            .post('/api/events/me')
            .set('Authorization', userA.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get(`/api/events/me/${eventA.id}`)
            .set('Authorization', userB.bearerHeader);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });

    it('PATCH /api/events/me/:eventId should return 200 when updating event successfully', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .patch(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', authUser.bearerHeader)
            .send({
                name: 'Updated Event Name',
            });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Event Name');
    });

    it('PATCH /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const userA = await createAuthenticatedUser(client);
        const userB = await createAuthenticatedUser(client);

        const { body: eventA } = await client
            .post('/api/events/me')
            .set('Authorization', userA.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .patch(`/api/events/me/${eventA.id}`)
            .set('Authorization', userB.bearerHeader)
            .send({
                name: 'Unauthorized update attempt',
            });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });

    it('DELETE /api/events/me/:eventId should return 200 when deleting event successfully', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .delete(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdEvent.id);
    });

    it('DELETE /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const userA = await createAuthenticatedUser(client);
        const userB = await createAuthenticatedUser(client);

        const { body: eventA } = await client
            .post('/api/events/me')
            .set('Authorization', userA.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .delete(`/api/events/me/${eventA.id}`)
            .set('Authorization', userB.bearerHeader);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });
});

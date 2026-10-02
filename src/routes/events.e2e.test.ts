import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { event, user } from '../tests/index.js';

describe('Events Routes (Elysia E2E)', () => {
    const client = testClient(app);

    it('POST /api/events/me should return 201 when creating an event successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
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
        expect(response.body.user_id).toBe(createdUser.id);
    });

    it('POST /api/events/me should return 401 when unauthorized', async () => {
        const response = await client.post('/api/events/me').send({
            ...event,
            id: undefined,
        });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('POST /api/events/me should return 400 when invalid body', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
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
        expect(response.body.message).toBe('Name is required.');
    });

    it('POST /api/events/me should return 400 when end_date is before start_date', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
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

    it('GET /api/events/me should return 200 with user events', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
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
            .get('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

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
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
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
    });

    it('GET /api/events/me/:eventId should return 400 when eventId is invalid UUID', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .get('/api/events/me/not-a-valid-uuid')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'The provided id is not valid.',
        });
    });

    it('GET /api/events/me/:eventId should return 404 when event does not exist', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .get(`/api/events/me/${user.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Event not found.' });
    });

    it('GET /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const { body: userA } = await client.post('/api/auth').send({
            ...user,
            email: `usera_events_${Date.now()}@example.com`,
            id: undefined,
        });
        const { body: userB } = await client.post('/api/auth').send({
            ...user,
            email: `userb_events_${Date.now()}@example.com`,
            id: undefined,
        });

        const { body: eventA } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${userA.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get(`/api/events/me/${eventA.id}`)
            .set('Authorization', `Bearer ${userB.tokens.accessToken}`);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });

    it('PATCH /api/events/me/:eventId should return 200 when updating event successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
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
                name: 'Updated Event Name',
            });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Event Name');
    });

    it('PATCH /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const { body: userA } = await client.post('/api/auth').send({
            ...user,
            email: `usera_patch_${Date.now()}@example.com`,
            id: undefined,
        });
        const { body: userB } = await client.post('/api/auth').send({
            ...user,
            email: `userb_patch_${Date.now()}@example.com`,
            id: undefined,
        });

        const { body: eventA } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${userA.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .patch(`/api/events/me/${eventA.id}`)
            .set('Authorization', `Bearer ${userB.tokens.accessToken}`)
            .send({
                name: 'Unauthorized update attempt',
            });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });

    it('DELETE /api/events/me/:eventId should return 200 when deleting event successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
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
        const { body: userA } = await client.post('/api/auth').send({
            ...user,
            email: `usera_delete_${Date.now()}@example.com`,
            id: undefined,
        });
        const { body: userB } = await client.post('/api/auth').send({
            ...user,
            email: `userb_delete_${Date.now()}@example.com`,
            id: undefined,
        });

        const { body: eventA } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${userA.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .delete(`/api/events/me/${eventA.id}`)
            .set('Authorization', `Bearer ${userB.tokens.accessToken}`);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });
});

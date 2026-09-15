import request from 'supertest';
import { app } from '../app.js';
import { event, user } from '../tests/index.js';

describe('Event Routes E2E Tests', () => {
    it('POST /api/events/me should return 201 when creating an event successfully', async () => {
        const { body: createdUser } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
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
        const response = await request(app)
            .post('/api/events/me')
            .send({
                ...event,
                id: undefined,
            });

        expect(response.status).toBe(401);
    });

    it('POST /api/events/me should return 400 when invalid body', async () => {
        const { body: createdUser } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
                name: '',
            });

        expect(response.status).toBe(400);
    });

    it('GET /api/events/me should return 200 with user events', async () => {
        const { body: createdUser } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        await request(app)
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await request(app)
            .get('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].name).toBe(event.name);
    });

    it('GET /api/events/me should return 401 when unauthorized', async () => {
        const response = await request(app).get('/api/events/me');

        expect(response.status).toBe(401);
    });

    it('GET /api/events/me/:eventId should return 200 when fetching event by id', async () => {
        const { body: createdUser } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        const { body: createdEvent } = await request(app)
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await request(app)
            .get(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdEvent.id);
        expect(response.body.name).toBe(event.name);
    });

    it('GET /api/events/me/:eventId should return 404 when event does not exist', async () => {
        const { body: createdUser } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .get(`/api/events/me/${user.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(404);
    });

    it('GET /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const { body: user1 } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        const { body: user2 } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                email: 'user2@example.com',
                id: undefined,
            });

        const { body: eventUser1 } = await request(app)
            .post('/api/events/me')
            .set('Authorization', `Bearer ${user1.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await request(app)
            .get(`/api/events/me/${eventUser1.id}`)
            .set('Authorization', `Bearer ${user2.tokens.accessToken}`);

        expect(response.status).toBe(403);
    });

    it('PATCH /api/events/me/:eventId should return 200 when updating event successfully', async () => {
        const { body: createdUser } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        const { body: createdEvent } = await request(app)
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await request(app)
            .patch(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                name: 'Updated Name',
            });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Name');
    });

    it('PATCH /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const { body: user1 } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        const { body: user2 } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                email: 'user2patch@example.com',
                id: undefined,
            });

        const { body: eventUser1 } = await request(app)
            .post('/api/events/me')
            .set('Authorization', `Bearer ${user1.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await request(app)
            .patch(`/api/events/me/${eventUser1.id}`)
            .set('Authorization', `Bearer ${user2.tokens.accessToken}`)
            .send({
                name: 'Updated Name',
            });

        expect(response.status).toBe(403);
    });

    it('DELETE /api/events/me/:eventId should return 200 when deleting event successfully', async () => {
        const { body: createdUser } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        const { body: createdEvent } = await request(app)
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await request(app)
            .delete(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdEvent.id);

        const getResponse = await request(app)
            .get(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(getResponse.status).toBe(404);
    });

    it('DELETE /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const { body: user1 } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                id: undefined,
            });

        const { body: user2 } = await request(app)
            .post('/api/auth')
            .send({
                ...user,
                email: 'user2delete@example.com',
                id: undefined,
            });

        const { body: eventUser1 } = await request(app)
            .post('/api/events/me')
            .set('Authorization', `Bearer ${user1.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await request(app)
            .delete(`/api/events/me/${eventUser1.id}`)
            .set('Authorization', `Bearer ${user2.tokens.accessToken}`);

        expect(response.status).toBe(403);
    });
});

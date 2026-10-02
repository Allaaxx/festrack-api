import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { elysiaApp, authPlugin, testClient } from './index.js';
import jwt from 'jsonwebtoken';

describe('Elysia Foundation & Plugins', () => {
    it('should respond to Swagger documentation endpoint at /docs', async () => {
        const client = testClient(elysiaApp);
        const response = await client.get('/docs');
        expect(response.status).toBe(200);
    });

    it('should generate dynamic OpenAPI 3.0 specification at /docs/json', async () => {
        const client = testClient(elysiaApp);
        const response = await client.get('/docs/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.openapi).toMatch(/^3\./);
        expect(response.body.info.title).toBe('Financial Tracking API');
    });

    it('should enforce CORS headers on preflight requests', async () => {
        const response = await elysiaApp.handle(
            new Request('http://localhost/docs', {
                method: 'OPTIONS',
                headers: {
                    Origin: 'http://localhost:5173',
                    'Access-Control-Request-Method': 'GET',
                },
            }),
        );
        expect(response.status).toBe(204);
        expect(response.headers.get('access-control-allow-origin')).toBe(
            'http://localhost:5173',
        );
    });

    it('should return 401 Unauthorized when accessing protected route without token', async () => {
        const testApp = new Elysia()
            .use(authPlugin)
            .get('/api/test-protected', ({ userId }) => ({ userId }), {
                isAuth: true,
            });

        const client = testClient(testApp);
        const response = await client.get('/api/test-protected');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('should allow access and extract userId when valid Bearer token is provided', async () => {
        const secret =
            process.env.JWT_ACCESS_TOKEN_SECRET || 'access_token_secret';
        const validToken = jwt.sign({ userId: 'valid-user-id' }, secret, {
            expiresIn: '15m',
        });

        const testApp = new Elysia()
            .use(authPlugin)
            .get('/api/test-protected', ({ userId }) => ({ userId }), {
                isAuth: true,
            });

        const client = testClient(testApp);
        const response = await client
            .get('/api/test-protected')
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ userId: 'valid-user-id' });
    });

    it('should reject invalid or expired Bearer token with 401', async () => {
        const testApp = new Elysia()
            .use(authPlugin)
            .get('/api/test-protected', ({ userId }) => ({ userId }), {
                isAuth: true,
            });

        const client = testClient(testApp);
        const response = await client
            .get('/api/test-protected')
            .set('Authorization', 'Bearer invalid.token.payload');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('should support in-memory testClient post requests with payload', async () => {
        const testApp = new Elysia().post('/api/echo', ({ body }) => body);

        const client = testClient(testApp);
        const response = await client
            .post('/api/echo')
            .send({ test: 'payload-value' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ test: 'payload-value' });
    });
});

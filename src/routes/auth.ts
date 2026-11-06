import { Elysia } from 'elysia';
import { auth } from '../auth.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
    .post('/set-password', async ({ request, body }) => {
        return auth.api.setPassword({
            body: { newPassword: (body as any).newPassword },
            headers: request.headers,
        });
    })
    .all('/*', ({ request }) => auth.handler(request))
    .all('/', ({ request }) => auth.handler(request));

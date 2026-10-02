import { Elysia } from 'elysia';
import { auth } from '../auth.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
    .all('/*', ({ request }) => auth.handler(request))
    .all('/', ({ request }) => auth.handler(request));

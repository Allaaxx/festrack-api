import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { authPlugin } from './plugins/auth.js';

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

export const elysiaApp = new Elysia()
    .use(
        cors({
            origin: allowedOrigins,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }),
    )
    .use(
        swagger({
            path: '/docs',
            documentation: {
                info: {
                    title: 'Financial Tracking API',
                    version: '1.0.0',
                    description:
                        'API for managing personal and event-related financial planning, expenses, and tracking.',
                },
                tags: [
                    { name: 'Auth', description: 'Authentication endpoints' },
                    {
                        name: 'Users',
                        description: 'User profile and balance management',
                    },
                    {
                        name: 'Events',
                        description: 'Event and project financial management',
                    },
                    {
                        name: 'Transactions',
                        description: 'Financial movements and transactions',
                    },
                ],
            },
        }),
    )
    .use(authPlugin);

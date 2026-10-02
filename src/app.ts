import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { authPlugin } from './plugins/auth.js';
import {
    authRoutes,
    usersRoutes,
    eventsRoutes,
    transactionsRoutes,
} from './routes/index.js';

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

const getValidationErrorMessage = (error: {
    customError?: unknown;
    summary?: string;
    message?: string;
}): string => {
    if (error.customError) {
        return typeof error.customError === 'string'
            ? error.customError
            : JSON.stringify(error.customError);
    }
    if (error.summary) return error.summary;
    if (error.message) {
        try {
            const parsed = JSON.parse(error.message);
            if (parsed.summary) return parsed.summary;
            if (parsed.message) return parsed.message;
        } catch {
            return error.message;
        }
    }
    return 'Validation failed';
};

export const app = new Elysia({ normalize: false })
    .onError(({ code, error, set }) => {
        if (code === 'VALIDATION') {
            set.status = 400;
            return { message: getValidationErrorMessage(error) };
        }
    })
    .use(
        cors({
            origin: allowedOrigins,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
            credentials: true,
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
    .use(authPlugin)
    .use(authRoutes)
    .use(usersRoutes)
    .use(eventsRoutes)
    .use(transactionsRoutes);

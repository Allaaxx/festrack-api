import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import { db } from './db/postgres/index.js';
import * as schema from './db/postgres/schemas/index.js';

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:8080',
    secret:
        process.env.BETTER_AUTH_SECRET ||
        process.env.JWT_ACCESS_TOKEN_SECRET ||
        'secret',
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path === '/sign-up/email') {
                if (
                    ctx.body &&
                    !ctx.body.name &&
                    (ctx.body.first_name || ctx.body.last_name)
                ) {
                    ctx.body.name =
                        [ctx.body.first_name, ctx.body.last_name]
                            .filter(Boolean)
                            .join(' ') || 'User';
                }
            }
        }),
    },
    plugins: [bearer()],
    user: {
        additionalFields: {
            first_name: { type: 'string', required: true },
            last_name: { type: 'string', required: true },
        },
    },
});

export type Auth = typeof auth;

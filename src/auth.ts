import { i18n, locales } from '@better-auth/i18n';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { bearer } from 'better-auth/plugins';
import { and, eq } from 'drizzle-orm';
import { db } from './db/postgres/index.js';
import * as schema from './db/postgres/schemas/index.js';
import { env } from './config/env.js';

const envTrustedOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS
    ? env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map((origin) => origin.trim())
    : [];

export const trustedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    env.FRONTEND_URL,
    ...envTrustedOrigins,
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins,
    secret: env.BETTER_AUTH_SECRET,
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
        minPasswordLength: 6,
    },
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID || '',
            clientSecret: env.GOOGLE_CLIENT_SECRET || '',
            accessType: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/calendar.events'],
            mapProfileToUser: (profile) => {
                const firstName =
                    profile.given_name || profile.name?.split(' ')[0] || 'User';
                const lastName =
                    profile.family_name ||
                    profile.name?.split(' ').slice(1).join(' ') ||
                    firstName;
                return {
                    first_name: firstName,
                    last_name: lastName,
                };
            },
        },
    },
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ['google'],
            requireLocalEmailVerified: false,
        },
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

            if (ctx.path === '/unlink-account') {
                if (ctx.body && ctx.body.providerId && !ctx.body.accountId) {
                    const session = await auth.api.getSession({
                        headers: ctx.headers || new Headers(),
                    });
                    if (session) {
                        const [userAccount] = await db
                            .select()
                            .from(schema.account)
                            .where(
                                and(
                                    eq(schema.account.userId, session.user.id),
                                    eq(
                                        schema.account.providerId,
                                        ctx.body.providerId,
                                    ),
                                ),
                            );
                        ctx.body.accountId = userAccount
                            ? userAccount.id
                            : 'non-existent-account-id';
                    } else {
                        ctx.body.accountId = 'unauthenticated';
                    }
                }
            }
        }),
    },
    plugins: [
        bearer(),
        i18n({
            translations: {
                pt: locales.pt,
            },
            defaultLocale: 'pt',
        }),
    ],
    user: {
        additionalFields: {
            first_name: { type: 'string', required: true },
            last_name: { type: 'string', required: true },
        },
    },
});

export type Auth = typeof auth;

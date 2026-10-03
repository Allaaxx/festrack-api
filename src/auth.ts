import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import { db } from './db/postgres/index.js';
import * as schema from './db/postgres/schemas/index.js';
import { i18n, locales } from '@better-auth/i18n';
import { eq, and } from 'drizzle-orm';

const envTrustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map((origin) =>
          origin.trim(),
      )
    : [];

export const trustedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
    ...envTrustedOrigins,
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:8080',
    trustedOrigins,
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
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
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

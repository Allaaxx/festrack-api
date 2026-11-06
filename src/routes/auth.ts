import { Elysia, t } from 'elysia';
import { APIError } from 'better-auth/api';
import { auth } from '../auth.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
    .post(
        '/set-password',
        async ({ request, body, set }) => {
            try {
                return await auth.api.setPassword({
                    body: { newPassword: body.newPassword },
                    headers: request.headers,
                });
            } catch (error: any) {
                if (
                    error instanceof APIError ||
                    error?.status === 'UNAUTHORIZED' ||
                    error?.statusCode === 401 ||
                    error?.status === 'BAD_REQUEST' ||
                    error?.statusCode === 400 ||
                    error?.code === 'PASSWORD_ALREADY_SET' ||
                    error?.body?.code === 'PASSWORD_ALREADY_SET'
                ) {
                    const isUnauthorized =
                        error?.status === 'UNAUTHORIZED' ||
                        error?.statusCode === 401;

                    set.status = isUnauthorized ? 401 : 400;

                    return (
                        error?.body ?? {
                            message: error?.message || 'Error',
                            ...(error?.body?.code || error?.code
                                ? { code: error?.body?.code || error?.code }
                                : {}),
                        }
                    );
                }

                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            body: t.Object({
                newPassword: t.String({ minLength: 6 }),
            }),
        },
    )
    .all('/*', ({ request }) => auth.handler(request))
    .all('/', ({ request }) => auth.handler(request));

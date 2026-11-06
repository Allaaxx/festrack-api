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
                    const statusCode =
                        typeof error?.statusCode === 'number'
                            ? error.statusCode
                            : error?.status === 'UNAUTHORIZED'
                              ? 401
                              : error?.status === 'BAD_REQUEST' ||
                                  error?.code === 'PASSWORD_ALREADY_SET' ||
                                  error?.body?.code === 'PASSWORD_ALREADY_SET'
                                ? 400
                                : 500;

                    set.status = statusCode;

                    return (
                        error?.body ?? {
                            message: error?.message || 'Error',
                            ...(error?.code || error?.body?.code
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
            detail: {
                tags: ['Auth'],
                summary:
                    'Set password for users without an existing credential',
            },
            body: t.Object(
                { newPassword: t.String({ minLength: 6 }) },
                { additionalProperties: false },
            ),
        },
    )
    .all('/*', ({ request }) => auth.handler(request))
    .all('/', ({ request }) => auth.handler(request));

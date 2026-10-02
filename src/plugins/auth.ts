import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export const authPlugin = new Elysia({ name: 'auth-plugin' })
    .use(
        jwt({
            name: 'jwtAccess',
            secret:
                process.env.JWT_ACCESS_TOKEN_SECRET || 'access_token_secret',
        }),
    )
    .derive({ as: 'scoped' }, async ({ headers, jwtAccess }) => {
        const authHeader = headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
            return { userId: null };
        }
        const token = authHeader.slice(7);
        try {
            const payload = await jwtAccess.verify(token);
            if (
                !payload ||
                typeof payload !== 'object' ||
                !('userId' in payload) ||
                !payload.userId
            ) {
                return { userId: null };
            }
            return { userId: payload.userId as string };
        } catch {
            return { userId: null };
        }
    })
    .macro({
        isAuth(enabled: boolean) {
            if (!enabled) return;
            return {
                beforeHandle({ userId, set }) {
                    if (!userId) {
                        set.status = 401;
                        return { message: 'Unauthorized' };
                    }
                },
            };
        },
    });

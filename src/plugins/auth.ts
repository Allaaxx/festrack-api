import { Elysia } from 'elysia';
import { auth } from '../auth.js';

export const authPlugin = new Elysia({ name: 'auth-plugin' })
    .derive({ as: 'scoped' }, async ({ request }) => {
        try {
            const sessionData = await auth.api.getSession({
                headers: request.headers,
            });

            if (!sessionData?.user?.id) {
                return { userId: null, session: null, user: null };
            }

            return {
                userId: sessionData.user.id,
                session: sessionData.session,
                user: sessionData.user,
            };
        } catch {
            return { userId: null, session: null, user: null };
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

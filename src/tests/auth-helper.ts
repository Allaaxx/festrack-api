import { testClient } from '../test-helper.js';

export interface AuthenticatedTestUser {
    user: {
        id: string;
        email: string;
        name: string;
        first_name: string;
        last_name: string;
    };
    token: string;
    cookie: string;
    bearerHeader: string;
    cookieHeader: string;
}

export async function createAuthenticatedUser(
    client: ReturnType<typeof testClient>,
    overrides?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        password?: string;
    },
): Promise<AuthenticatedTestUser> {
    const uniqueEmail =
        overrides?.email ||
        `test_user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@example.com`;

    const res = await client.post('/api/auth/sign-up/email').send({
        email: uniqueEmail,
        password: overrides?.password || 'Password123!',
        first_name: overrides?.first_name || 'John',
        last_name: overrides?.last_name || 'Doe',
    });

    const token = res.body?.token;
    const cookie = res.headers.get('set-cookie')?.split(';')[0] || '';

    return {
        user: res.body?.user,
        token,
        cookie,
        bearerHeader: `Bearer ${token}`,
        cookieHeader: cookie,
    };
}

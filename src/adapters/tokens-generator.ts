import crypto from 'node:crypto';

export interface GeneratedTokens {
    accessToken: string;
    refreshToken: string;
}

export interface TokensGenerator {
    execute(userId: string): GeneratedTokens;
}

const signToken = (
    payload: object,
    secret: string,
    expiresInSeconds: number,
): string => {
    const header = Buffer.from(
        JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const body = Buffer.from(
        JSON.stringify({
            ...payload,
            iat: now,
            exp: now + expiresInSeconds,
        }),
    ).toString('base64url');
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
};

export class TokensGeneratorAdapter implements TokensGenerator {
    execute(userId: string): GeneratedTokens {
        const accessTokenSecret =
            process.env.JWT_ACCESS_TOKEN_SECRET || 'access_token_secret';
        const refreshTokenSecret =
            process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh_token_secret';

        return {
            accessToken: signToken({ userId }, accessTokenSecret, 15 * 60),
            refreshToken: signToken(
                { userId },
                refreshTokenSecret,
                30 * 24 * 60 * 60,
            ),
        };
    }
}

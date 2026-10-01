import jwt from 'jsonwebtoken';

export interface GeneratedTokens {
    accessToken: string;
    refreshToken: string;
}

export interface TokensGenerator {
    execute(userId: string): GeneratedTokens;
}

export class TokensGeneratorAdapter implements TokensGenerator {
    execute(userId: string): GeneratedTokens {
        const accessTokenSecret = process.env.JWT_ACCESS_TOKEN_SECRET;
        const refreshTokenSecret = process.env.JWT_REFRESH_TOKEN_SECRET;

        if (!accessTokenSecret) {
            throw new Error('JWT_ACCESS_TOKEN_SECRET is not defined');
        }

        if (!refreshTokenSecret) {
            throw new Error('JWT_REFRESH_TOKEN_SECRET is not defined');
        }

        return {
            accessToken: jwt.sign(
                { userId },
                accessTokenSecret,
                { expiresIn: '15m' },
            ),
            refreshToken: jwt.sign(
                { userId },
                refreshTokenSecret,
                { expiresIn: '30d' },
            ),
        };
    }
}

import jwt from 'jsonwebtoken';

import { TokensGeneratorAdapter } from './tokens-generator.js';

describe('Tokens Generator Adapter', () => {
    it('should generate valid access and refresh tokens', () => {
        const sut = new TokensGeneratorAdapter();
        const userId = 'user-uuid-123';

        const tokens = sut.execute(userId);

        expect(tokens.accessToken).toBeTruthy();
        expect(tokens.refreshToken).toBeTruthy();

        const decodedAccess = jwt.verify(
            tokens.accessToken,
            process.env.JWT_ACCESS_TOKEN_SECRET as string,
        ) as jwt.JwtPayload;
        expect(decodedAccess.userId).toBe(userId);

        const decodedRefresh = jwt.verify(
            tokens.refreshToken,
            process.env.JWT_REFRESH_TOKEN_SECRET as string,
        ) as jwt.JwtPayload;
        expect(decodedRefresh.userId).toBe(userId);
    });
});

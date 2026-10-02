import { describe, it, expect } from 'bun:test';
import { TokensGeneratorAdapter } from './tokens-generator.js';
import { TokenVerifierAdapter, TokenPayload } from './token-verifier.js';

describe('Tokens Generator Adapter', () => {
    it('should generate valid access and refresh tokens', () => {
        const sut = new TokensGeneratorAdapter();
        const verifier = new TokenVerifierAdapter();
        const userId = 'user-uuid-123';

        const tokens = sut.execute(userId);

        expect(tokens.accessToken).toBeTruthy();
        expect(tokens.refreshToken).toBeTruthy();

        const decodedAccess = verifier.execute(
            tokens.accessToken,
            process.env.JWT_ACCESS_TOKEN_SECRET as string,
        ) as TokenPayload;
        expect(decodedAccess.userId).toBe(userId);

        const decodedRefresh = verifier.execute(
            tokens.refreshToken,
            process.env.JWT_REFRESH_TOKEN_SECRET as string,
        ) as TokenPayload;
        expect(decodedRefresh.userId).toBe(userId);
    });
});

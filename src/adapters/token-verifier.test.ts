import { describe, it, expect } from 'bun:test';
import { TokenVerifierAdapter, TokenPayload } from './token-verifier.js';
import { TokensGeneratorAdapter } from './tokens-generator.js';

describe('Token Verifier Adapter', () => {
    it('should verify a valid token', () => {
        const sut = new TokenVerifierAdapter();
        const generator = new TokensGeneratorAdapter();
        const userId = 'user-uuid-123';
        const tokens = generator.execute(userId);

        const result = sut.execute(
            tokens.accessToken,
            process.env.JWT_ACCESS_TOKEN_SECRET as string,
        ) as TokenPayload;

        expect(result.userId).toBe(userId);
    });

    it('should throw an error for an invalid token', () => {
        const sut = new TokenVerifierAdapter();
        const secret = 'test-secret';

        expect(() => {
            sut.execute('invalid-token', secret);
        }).toThrow();
    });
});

import jwt from 'jsonwebtoken';

import { TokenVerifierAdapter } from './token-verifier.js';

describe('Token Verifier Adapter', () => {
    it('should verify a valid token', () => {
        const sut = new TokenVerifierAdapter();
        const secret = 'test-secret';
        const payload = { userId: '123' };
        const token = jwt.sign(payload, secret);

        const result = sut.execute(token, secret) as jwt.JwtPayload;

        expect(result.userId).toBe('123');
    });

    it('should throw an error for an invalid token', () => {
        const sut = new TokenVerifierAdapter();
        const secret = 'test-secret';

        expect(() => {
            sut.execute('invalid-token', secret);
        }).toThrow();
    });
});

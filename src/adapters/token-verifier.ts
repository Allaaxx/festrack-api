import crypto from 'node:crypto';

export interface TokenPayload {
    userId: string;
    iat?: number;
    exp?: number;
    [key: string]: unknown;
}

export interface TokenVerifier {
    execute(token: string, secret: string): string | TokenPayload;
}

export class TokenVerifierAdapter implements TokenVerifier {
    execute(token: string, secret: string): string | TokenPayload {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('jwt malformed');
        }

        const [headerB64, payloadB64, signature] = parts;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${headerB64}.${payloadB64}`)
            .digest('base64url');

        if (signature !== expectedSignature) {
            throw new Error('invalid signature');
        }

        const payload = JSON.parse(
            Buffer.from(payloadB64, 'base64url').toString('utf8'),
        ) as TokenPayload;

        if (payload.exp && Date.now() >= payload.exp * 1000) {
            throw new Error('jwt expired');
        }

        return payload;
    }
}

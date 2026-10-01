import jwt from 'jsonwebtoken';

export interface TokenPayload extends jwt.JwtPayload {
    userId: string;
}

export interface TokenVerifier {
    execute(token: string, secret: string): string | jwt.JwtPayload;
}

export class TokenVerifierAdapter implements TokenVerifier {
    execute(token: string, secret: string): string | jwt.JwtPayload {
        return jwt.verify(token, secret);
    }
}

import jwt from 'jsonwebtoken';

export class TokenVerifierAdapter {
    async execute(token, secret) {
        return jwt.verify(token, secret);
    }
}

import { verifyPassword } from 'better-auth/crypto';
import { PasswordVerifier } from '../domain/index.js';

export class BetterAuthPasswordVerifier implements PasswordVerifier {
    async verify(password: string, hash: string): Promise<boolean> {
        return verifyPassword({ hash, password });
    }
}

import bcrypt from 'bcrypt';

export interface PasswordHasher {
    execute(password: string): Promise<string>;
}

export class PasswordHasherAdapter implements PasswordHasher {
    execute(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }
}

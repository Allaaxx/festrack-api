import bcrypt from 'bcrypt';

export interface PasswordComparator {
    execute(password: string, hashedPassword: string): Promise<boolean>;
}

export class PasswordComparatorAdapter implements PasswordComparator {
    execute(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
    }
}

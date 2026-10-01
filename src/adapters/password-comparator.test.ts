import bcrypt from 'bcrypt';

import { PasswordComparatorAdapter } from './password-comparator.js';

describe('Password Comparator Adapter', () => {
    it('should return false when passwords do not match', async () => {
        const sut = new PasswordComparatorAdapter();
        const result = await sut.execute('password', 'hashed_password');
        expect(result).toBe(false);
    });

    it('should return true when passwords match', async () => {
        const sut = new PasswordComparatorAdapter();
        const password = 'my_secure_password';
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await sut.execute(password, hashedPassword);
        expect(result).toBe(true);
    });
});

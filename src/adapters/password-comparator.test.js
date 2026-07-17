import { PasswordComparatorAdapter } from './password-comparator';

describe('Password Comparator Adapter', () => {
    it('should return false when passwords do not match', async () => {
        const sut = new PasswordComparatorAdapter();
        const result = await sut.execute('password', 'hashed_password');
        expect(result).toBe(false);
    });
});

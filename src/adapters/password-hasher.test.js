import { faker } from '@faker-js/faker';

import { PasswordHasherAdapter } from './password-hasher.js';

describe('Password Hasher Adapter', () => {
    it('should hash a password', async () => {
        const sut = new PasswordHasherAdapter();
        const password = faker.internet.password();

        const result = await sut.execute(password);

        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result).not.toBe(password);
    });
});
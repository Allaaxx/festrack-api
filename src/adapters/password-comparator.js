import bcrypt from 'bcrypt';

export class PasswordComparatorAdapter {
    async execute(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }
}

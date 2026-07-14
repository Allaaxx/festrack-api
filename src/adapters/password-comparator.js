import bcrypt from 'bcrypt';

export class PaswwordComparatorAdapter {
    async execute(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }
}

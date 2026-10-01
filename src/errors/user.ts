export class EmailAlreadyInUseError extends Error {
    constructor(email: string) {
        super(`The e-mail ${email} is already in use`);
        this.name = 'EmailAlreadyInUseError';
    }
}

export class UserNotFoundError extends Error {
    constructor(userId?: string) {
        super(userId ? `User with id ${userId} not found.` : 'User not found.');
        this.name = 'UserNotFoundError';
    }
}

export class InvalidPasswordError extends Error {
    constructor() {
        super('Invalid password');
        this.name = 'InvalidPasswordError';
    }
}

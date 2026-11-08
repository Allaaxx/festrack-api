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

export class InvalidFileTypeError extends Error {
    constructor(fileType: string, allowedTypes?: string[]) {
        const allowed = allowedTypes
            ? allowedTypes.join(', ')
            : 'image/jpeg, image/png, image/webp';
        super(`Invalid file type: ${fileType}. Allowed types are ${allowed}.`);
        this.name = 'InvalidFileTypeError';
    }
}

export class FileSizeExceededError extends Error {
    constructor(maxSizeMb: number = 5) {
        super(`File size exceeds the maximum allowed size of ${maxSizeMb}MB.`);
        this.name = 'FileSizeExceededError';
    }
}

export class CannotUnlinkLastProviderError extends Error {
    constructor() {
        super('Cannot unlink the only remaining authentication provider.');
        this.name = 'CannotUnlinkLastProviderError';
    }
}

export class AccountNotFoundError extends Error {
    constructor(providerId?: string) {
        super(
            providerId
                ? `Account with provider ${providerId} not found.`
                : 'Account not found.',
        );
        this.name = 'AccountNotFoundError';
    }
}

import {
    EmailAlreadyInUseError,
    UserNotFoundError,
    InvalidPasswordError,
    EventNotFoundError,
    TransactionNotFoundError,
    UnauthorizedError,
    ForbiddenError,
    CannotUnlinkLastProviderError,
    AccountNotFoundError,
} from './index.js';

describe('Domain Errors', () => {
    it('EmailAlreadyInUseError should have correct message and name', () => {
        const error = new EmailAlreadyInUseError('test@example.com');
        expect(error.name).toBe('EmailAlreadyInUseError');
        expect(error.message).toBe(
            'The e-mail test@example.com is already in use',
        );
        expect(error).toBeInstanceOf(Error);
    });

    it('UserNotFoundError should have correct message and name', () => {
        const error = new UserNotFoundError('user-123');
        expect(error.name).toBe('UserNotFoundError');
        expect(error.message).toBe('User with id user-123 not found.');
        expect(error).toBeInstanceOf(Error);
    });

    it('InvalidPasswordError should have correct message and name', () => {
        const error = new InvalidPasswordError();
        expect(error.name).toBe('InvalidPasswordError');
        expect(error.message).toBe('Invalid password');
        expect(error).toBeInstanceOf(Error);
    });

    it('EventNotFoundError should have correct message and name', () => {
        const error = new EventNotFoundError('event-123');
        expect(error.name).toBe('EventNotFoundError');
        expect(error.message).toBe('Event with id event-123 not found.');
        expect(error).toBeInstanceOf(Error);
    });

    it('TransactionNotFoundError should have correct message and name', () => {
        const error = new TransactionNotFoundError('tx-123');
        expect(error.name).toBe('TransactionNotFoundError');
        expect(error.message).toBe('Transaction with id tx-123 not found.');
        expect(error).toBeInstanceOf(Error);
    });

    it('UnauthorizedError should have correct message and name', () => {
        const error = new UnauthorizedError();
        expect(error.name).toBe('UnauthorizedError');
        expect(error.message).toBe('Unauthorized.');
        expect(error).toBeInstanceOf(Error);
    });

    it('ForbiddenError should have correct message and name', () => {
        const error = new ForbiddenError();
        expect(error.name).toBe('ForbiddenError');
        expect(error.message).toBe('Forbidden.');
        expect(error).toBeInstanceOf(Error);
    });

    it('CannotUnlinkLastProviderError should have correct message and name', () => {
        const error = new CannotUnlinkLastProviderError();
        expect(error.name).toBe('CannotUnlinkLastProviderError');
        expect(error.message).toBe(
            'Cannot unlink the only remaining authentication provider.',
        );
        expect(error).toBeInstanceOf(Error);
    });

    it('AccountNotFoundError should have correct message and name', () => {
        const error = new AccountNotFoundError('google');
        expect(error.name).toBe('AccountNotFoundError');
        expect(error.message).toBe('Account with provider google not found.');
        expect(error).toBeInstanceOf(Error);
    });
});

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
    InvalidInvitationStateError,
    InvalidShopAssetFolderError,
    ShopAssetInvalidFileTypeError,
    ShopAssetFileSizeExceededError,
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

    it('InvalidInvitationStateError should have correct message and name', () => {
        const error = new InvalidInvitationStateError();
        expect(error.name).toBe('InvalidInvitationStateError');
        expect(error.message).toBe('Only pending invitations can be revoked.');
        expect(error).toBeInstanceOf(Error);
    });

    it('InvalidShopAssetFolderError should have correct message and name', () => {
        const error = new InvalidShopAssetFolderError('unknown_dir');
        expect(error.name).toBe('InvalidShopAssetFolderError');
        expect(error.message).toBe(
            'Invalid asset folder: unknown_dir. Allowed folders are: general, products, receipts.',
        );
        expect(error).toBeInstanceOf(Error);
    });

    it('ShopAssetInvalidFileTypeError should have correct message and name', () => {
        const defaultError = new ShopAssetInvalidFileTypeError('text/plain');
        expect(defaultError.name).toBe('ShopAssetInvalidFileTypeError');
        expect(defaultError.message).toBe(
            'Invalid file type: text/plain. Allowed types are image/jpeg, image/png, image/webp, image/avif.',
        );
        expect(defaultError).toBeInstanceOf(Error);

        const customError = new ShopAssetInvalidFileTypeError('text/plain', [
            'image/jpeg',
            'image/png',
        ]);
        expect(customError.message).toBe(
            'Invalid file type: text/plain. Allowed types are image/jpeg, image/png.',
        );
    });

    it('ShopAssetFileSizeExceededError should have correct message and name', () => {
        const defaultError = new ShopAssetFileSizeExceededError();
        expect(defaultError.name).toBe('ShopAssetFileSizeExceededError');
        expect(defaultError.message).toBe(
            'File size exceeds the maximum allowed size of 10MB.',
        );
        expect(defaultError).toBeInstanceOf(Error);

        const customError = new ShopAssetFileSizeExceededError(5);
        expect(customError.message).toBe(
            'File size exceeds the maximum allowed size of 5MB.',
        );
    });
});

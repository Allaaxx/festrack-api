import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { UnlinkUserAccountUseCase } from './unlink-user-account.js';
import { UserRepository, UserAccount } from '../../domain/index.js';
import {
    CannotUnlinkLastProviderError,
    AccountNotFoundError,
} from '../../errors/user.js';

describe('Unlink User Account Use Case', () => {
    let sut: UnlinkUserAccountUseCase;
    let userRepository: UserRepository;

    const mockAccounts: UserAccount[] = [
        {
            id: 'acc-1',
            userId: 'user-1',
            providerId: 'credential',
            accountId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: 'acc-2',
            userId: 'user-1',
            providerId: 'google',
            accountId: 'google-sub-123',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    beforeEach(() => {
        userRepository = {
            create: mock(),
            findById: mock(),
            findByEmail: mock(),
            update: mock(),
            delete: mock(),
            getBalance: mock(),
            listAccounts: mock().mockResolvedValue([...mockAccounts]),
            deleteAccount: mock().mockResolvedValue(mockAccounts[1]),
        };
        sut = new UnlinkUserAccountUseCase(userRepository);
    });

    it('should successfully unlink an account when multiple accounts exist', async () => {
        const result = await sut.execute('user-1', 'google');

        expect(result).toEqual(mockAccounts[1]);
        expect(userRepository.listAccounts).toHaveBeenCalledWith('user-1');
        expect(userRepository.deleteAccount).toHaveBeenCalledWith(
            'user-1',
            'google',
        );
        expect(userRepository.deleteAccount).toHaveBeenCalledTimes(1);
    });

    it('should throw CannotUnlinkLastProviderError when user only has one account', async () => {
        (userRepository.listAccounts as any).mockResolvedValueOnce([
            mockAccounts[0],
        ]);

        await expect(sut.execute('user-1', 'credential')).rejects.toThrow(
            CannotUnlinkLastProviderError,
        );
        expect(userRepository.deleteAccount).not.toHaveBeenCalled();
    });

    it('should throw CannotUnlinkLastProviderError when user has zero accounts', async () => {
        (userRepository.listAccounts as any).mockResolvedValueOnce([]);

        await expect(sut.execute('user-1', 'google')).rejects.toThrow(
            CannotUnlinkLastProviderError,
        );
        expect(userRepository.deleteAccount).not.toHaveBeenCalled();
    });

    it('should throw AccountNotFoundError when account with provider is not found', async () => {
        await expect(sut.execute('user-1', 'github')).rejects.toThrow(
            AccountNotFoundError,
        );
        expect(userRepository.deleteAccount).not.toHaveBeenCalled();
    });

    it('should throw if userRepository.deleteAccount throws', async () => {
        (userRepository.deleteAccount as any).mockRejectedValueOnce(
            new Error('Database delete error'),
        );

        await expect(sut.execute('user-1', 'google')).rejects.toThrow(
            'Database delete error',
        );
    });
});

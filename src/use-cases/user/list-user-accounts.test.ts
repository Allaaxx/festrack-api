import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ListUserAccountsUseCase } from './list-user-accounts.js';
import { UserRepository, UserAccount } from '../../domain/index.js';

describe('List User Accounts Use Case', () => {
    let sut: ListUserAccountsUseCase;
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
            listAccounts: mock().mockResolvedValue(mockAccounts),
            deleteAccount: mock(),
        };
        sut = new ListUserAccountsUseCase(userRepository);
    });

    it('should return all accounts for a given user id', async () => {
        const result = await sut.execute('user-1');

        expect(result).toEqual(mockAccounts);
        expect(userRepository.listAccounts).toHaveBeenCalledWith('user-1');
        expect(userRepository.listAccounts).toHaveBeenCalledTimes(1);
    });

    it('should throw if userRepository.listAccounts throws', async () => {
        (userRepository.listAccounts as any).mockRejectedValueOnce(
            new Error('Database error'),
        );

        await expect(sut.execute('user-1')).rejects.toThrow('Database error');
    });
});

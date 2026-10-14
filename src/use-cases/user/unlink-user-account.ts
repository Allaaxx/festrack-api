import { UserRepository, UserAccount } from '../../domain/index.js';
import {
    CannotUnlinkLastProviderError,
    AccountNotFoundError,
} from '../../errors/user.js';

export class UnlinkUserAccountUseCase {
    constructor(private readonly userRepository: UserRepository) {}

    async execute(userId: string, providerId: string): Promise<UserAccount> {
        const accounts = await this.userRepository.listAccounts(userId);

        if (accounts.length <= 1) {
            throw new CannotUnlinkLastProviderError();
        }

        const accountToUnlink = accounts.find(
            (account) => account.providerId === providerId,
        );

        if (!accountToUnlink) {
            throw new AccountNotFoundError(providerId);
        }

        const unlinkedAccount = await this.userRepository.deleteAccount(
            userId,
            providerId,
        );

        if (providerId === 'google') {
            await this.userRepository.update(userId, {
                google_calendar_sync_enabled: false,
            });
        }

        return unlinkedAccount;
    }
}

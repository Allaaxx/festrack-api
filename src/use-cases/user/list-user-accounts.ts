import { UserRepository, UserAccount } from '../../domain/index.js';

export class ListUserAccountsUseCase {
    constructor(private readonly userRepository: UserRepository) {}

    async execute(userId: string): Promise<UserAccount[]> {
        return this.userRepository.listAccounts(userId);
    }
}

import { UserNotFoundError } from '../../errors/user.js';
import { UserBalance, UserRepository } from '../../domain/index.js';

export class GetUserBalanceUseCase {
    constructor(
        private readonly userRepository: Pick<UserRepository, 'findById' | 'getBalance'>,
    ) {}

    async execute(userId: string, from: string, to: string): Promise<UserBalance> {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        const balance = await this.userRepository.getBalance(userId, from, to);
        return balance;
    }
}

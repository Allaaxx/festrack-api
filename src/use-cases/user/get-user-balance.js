import { UserNotFoundError } from '../../errors/user.js';

export class GetUserBalanceUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(userId, from, to) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }
        const balance = await this.userRepository.getBalance(userId, from, to);
        return balance;
    }
}

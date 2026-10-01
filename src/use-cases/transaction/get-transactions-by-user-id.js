import { UserNotFoundError } from '../../errors/user.js';

export class GetTransactionByUserIdUseCase {
    constructor(transactionRepository, userRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    async execute(userId, from, to) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        const transactions = await this.transactionRepository.findByUserId(
            userId,
            from,
            to,
        );

        return transactions;
    }
}

import { UserNotFoundError } from '../../errors/user.js';
import {
    Transaction,
    TransactionRepository,
    UserRepository,
} from '../../domain/index.js';

export class GetTransactionByUserIdUseCase {
    constructor(
        private readonly transactionRepository: Pick<
            TransactionRepository,
            'findByUserId'
        >,
        private readonly userRepository: Pick<UserRepository, 'findById'>,
    ) {}

    async execute(
        userId: string,
        from?: string,
        to?: string,
    ): Promise<Transaction[]> {
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

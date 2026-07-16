import { UserNotFoundError } from '../../errors/user.js';

export class GetTransactionByUserIdUseCase {
    constructor(getTransactionByUserIdRepository, getUserByIdRepository) {
        this.getTransactionByUserIdRepository =
            getTransactionByUserIdRepository;
        this.getUserByIdRepository = getUserByIdRepository;
    }
    async execute(userId, from, to) {
        const user = await this.getUserByIdRepository.execute(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        const transactions =
            await this.getTransactionByUserIdRepository.execute(
                userId,
                from,
                to,
            );

        return transactions;
    }
}

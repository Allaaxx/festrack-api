import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { UserNotFoundError } from '../../errors/user.js';

export class CreateTransactionUseCase {
    constructor(
        createTransactionRepository,
        getUserByIdRepository,
        idGeneratorAdapter,
        getEventByIdRepository,
    ) {
        this.createTransactionRepository = createTransactionRepository;
        this.getUserByIdRepository = getUserByIdRepository;
        this.idGeneratorAdapter = idGeneratorAdapter;
        this.getEventByIdRepository = getEventByIdRepository;
    }

    async execute(params) {
        const userId = params.user_id;

        const user = await this.getUserByIdRepository.execute(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        if (params.event_id) {
            const event = await this.getEventByIdRepository.execute(
                params.event_id,
            );

            if (!event) {
                throw new EventNotFoundError(params.event_id);
            }

            if (event.user_id !== userId) {
                throw new ForbiddenError();
            }
        }

        const transactionId = this.idGeneratorAdapter.execute();

        const transaction = await this.createTransactionRepository.execute({
            ...params,
            id: transactionId,
        });

        return transaction;
    }
}

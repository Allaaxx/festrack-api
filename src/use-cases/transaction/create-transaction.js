import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { UserNotFoundError } from '../../errors/user.js';

export class CreateTransactionUseCase {
    constructor(transactionRepository, userRepository, eventRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
    }

    async execute(params) {
        const userId = params.user_id;

        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        if (params.event_id) {
            const event = await this.eventRepository.findById(params.event_id);

            if (!event) {
                throw new EventNotFoundError(params.event_id);
            }

            if (event.user_id !== userId) {
                throw new ForbiddenError();
            }
        }

        const transaction = await this.transactionRepository.create(params);

        return transaction;
    }
}

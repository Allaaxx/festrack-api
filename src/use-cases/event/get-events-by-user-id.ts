import { UserNotFoundError } from '../../errors/user.js';
import { Event, EventRepository, UserRepository } from '../../domain/index.js';

export class GetEventsByUserIdUseCase {
    constructor(
        private readonly eventRepository: Pick<EventRepository, 'findByUserId'>,
        private readonly userRepository: Pick<UserRepository, 'findById'>,
    ) {}

    async execute(userId: string): Promise<Event[]> {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        return await this.eventRepository.findByUserId(userId);
    }
}

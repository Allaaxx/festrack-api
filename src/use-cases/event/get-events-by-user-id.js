import { UserNotFoundError } from '../../errors/user.js';

export class GetEventsByUserIdUseCase {
    constructor(eventRepository, userRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
    }

    async execute(userId) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        return await this.eventRepository.findByUserId(userId);
    }
}

import { UserNotFoundError } from '../../errors/user.js';

export class GetEventsByUserIdUseCase {
    constructor(eventRepository, getUserByIdRepository) {
        this.eventRepository = eventRepository;
        this.getUserByIdRepository = getUserByIdRepository;
    }

    async execute(userId) {
        const user = await this.getUserByIdRepository.execute(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        return await this.eventRepository.findByUserId(userId);
    }
}

import { UserNotFoundError } from '../../errors/user.js';

export class CreateEventUseCase {
    constructor(eventRepository, getUserByIdRepository) {
        this.eventRepository = eventRepository;
        this.getUserByIdRepository = getUserByIdRepository;
    }

    async execute(params) {
        const userId = params.user_id;

        const user = await this.getUserByIdRepository.execute(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        return await this.eventRepository.create(params);
    }
}

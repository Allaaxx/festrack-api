import { UserNotFoundError } from '../../errors/user.js';

export class CreateEventUseCase {
    constructor(eventRepository, userRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
    }

    async execute(params) {
        const userId = params.user_id;

        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        return await this.eventRepository.create(params);
    }
}

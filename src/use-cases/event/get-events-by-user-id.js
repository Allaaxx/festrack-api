import { UserNotFoundError } from '../../errors/user.js';

export class GetEventsByUserIdUseCase {
    constructor(getEventsByUserIdRepository, getUserByIdRepository) {
        this.getEventsByUserIdRepository = getEventsByUserIdRepository;
        this.getUserByIdRepository = getUserByIdRepository;
    }

    async execute(userId) {
        const user = await this.getUserByIdRepository.execute(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        return await this.getEventsByUserIdRepository.execute(userId);
    }
}

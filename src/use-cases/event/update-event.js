import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';

export class UpdateEventUseCase {
    constructor(getEventByIdRepository, updateEventRepository) {
        this.getEventByIdRepository = getEventByIdRepository;
        this.updateEventRepository = updateEventRepository;
    }

    async execute(eventId, userId, updateParams) {
        const event = await this.getEventByIdRepository.execute(eventId);

        if (!event) {
            throw new EventNotFoundError(eventId);
        }

        if (event.user_id !== userId) {
            throw new ForbiddenError();
        }

        return await this.updateEventRepository.execute(eventId, updateParams);
    }
}

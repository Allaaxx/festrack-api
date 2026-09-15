import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';

export class DeleteEventUseCase {
    constructor(getEventByIdRepository, deleteEventRepository) {
        this.getEventByIdRepository = getEventByIdRepository;
        this.deleteEventRepository = deleteEventRepository;
    }

    async execute(eventId, userId) {
        const event = await this.getEventByIdRepository.execute(eventId);

        if (!event) {
            throw new EventNotFoundError(eventId);
        }

        if (event.user_id !== userId) {
            throw new ForbiddenError();
        }

        return await this.deleteEventRepository.execute(eventId);
    }
}

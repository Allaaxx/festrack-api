import { UserNotFoundError } from '../../errors/user.js';
import {
    Event,
    CreateEventParams,
    EventRepository,
    UserRepository,
} from '../../domain/index.js';

export class CreateEventUseCase {
    constructor(
        private readonly eventRepository: Pick<EventRepository, 'create'>,
        private readonly userRepository: Pick<UserRepository, 'findById'>,
    ) {}

    async execute(params: CreateEventParams): Promise<Event> {
        const userId = params.user_id;

        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        return await this.eventRepository.create(params);
    }
}

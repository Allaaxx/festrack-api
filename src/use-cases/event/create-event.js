import { UserNotFoundError } from '../../errors/user.js';

export class CreateEventUseCase {
    constructor(
        createEventRepository,
        getUserByIdRepository,
        idGeneratorAdapter,
    ) {
        this.createEventRepository = createEventRepository;
        this.getUserByIdRepository = getUserByIdRepository;
        this.idGeneratorAdapter = idGeneratorAdapter;
    }

    async execute(params) {
        const userId = params.user_id;

        const user = await this.getUserByIdRepository.execute(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        const eventId = this.idGeneratorAdapter.execute();

        const event = await this.createEventRepository.execute({
            ...params,
            id: eventId,
        });

        return event;
    }
}

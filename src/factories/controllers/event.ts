import {
    CreateEventController,
    DeleteEventController,
    GetEventByIdController,
    GetEventsByUserIdController,
    UpdateEventController,
} from '../../controllers/index.js';
import {
    PostgresEventRepository,
    PostgresUserRepository,
} from '../../repositories/postgres/index.js';
import {
    CreateEventUseCase,
    DeleteEventUseCase,
    GetEventByIdUseCase,
    GetEventsByUserIdUseCase,
    UpdateEventUseCase,
} from '../../use-cases/index.js';

export const makeCreateEventController = (): CreateEventController => {
    const eventRepository = new PostgresEventRepository();
    const userRepository = new PostgresUserRepository();

    const createEventUseCase = new CreateEventUseCase(
        eventRepository,
        userRepository,
    );

    return new CreateEventController(createEventUseCase);
};

export const makeGetEventsByUserIdController =
    (): GetEventsByUserIdController => {
        const eventRepository = new PostgresEventRepository();
        const userRepository = new PostgresUserRepository();

        const getEventsByUserIdUseCase = new GetEventsByUserIdUseCase(
            eventRepository,
            userRepository,
        );

        return new GetEventsByUserIdController(getEventsByUserIdUseCase);
    };

export const makeGetEventByIdController = (): GetEventByIdController => {
    const eventRepository = new PostgresEventRepository();

    const getEventByIdUseCase = new GetEventByIdUseCase(eventRepository);

    return new GetEventByIdController(getEventByIdUseCase);
};

export const makeUpdateEventController = (): UpdateEventController => {
    const eventRepository = new PostgresEventRepository();

    const updateEventUseCase = new UpdateEventUseCase(eventRepository);

    return new UpdateEventController(updateEventUseCase);
};

export const makeDeleteEventController = (): DeleteEventController => {
    const eventRepository = new PostgresEventRepository();

    const deleteEventUseCase = new DeleteEventUseCase(eventRepository);

    return new DeleteEventController(deleteEventUseCase);
};

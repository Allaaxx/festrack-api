import {
    CreateEventController,
    DeleteEventController,
    GetEventByIdController,
    GetEventsByUserIdController,
    UpdateEventController,
} from '../../controllers/index.js';
import {
    PostgresEventRepository,
    PostgresGetUserByIdRepository,
} from '../../repositories/postgres/index.js';
import {
    CreateEventUseCase,
    DeleteEventUseCase,
    GetEventByIdUseCase,
    GetEventsByUserIdUseCase,
    UpdateEventUseCase,
} from '../../use-cases/index.js';

export const makeCreateEventController = () => {
    const eventRepository = new PostgresEventRepository();
    const getUserByIdRepository = new PostgresGetUserByIdRepository();

    const createEventUseCase = new CreateEventUseCase(
        eventRepository,
        getUserByIdRepository,
    );

    return new CreateEventController(createEventUseCase);
};

export const makeGetEventsByUserIdController = () => {
    const eventRepository = new PostgresEventRepository();
    const getUserByIdRepository = new PostgresGetUserByIdRepository();

    const getEventsByUserIdUseCase = new GetEventsByUserIdUseCase(
        eventRepository,
        getUserByIdRepository,
    );

    return new GetEventsByUserIdController(getEventsByUserIdUseCase);
};

export const makeGetEventByIdController = () => {
    const eventRepository = new PostgresEventRepository();

    const getEventByIdUseCase = new GetEventByIdUseCase(eventRepository);

    return new GetEventByIdController(getEventByIdUseCase);
};

export const makeUpdateEventController = () => {
    const eventRepository = new PostgresEventRepository();

    const updateEventUseCase = new UpdateEventUseCase(eventRepository);

    return new UpdateEventController(updateEventUseCase);
};

export const makeDeleteEventController = () => {
    const eventRepository = new PostgresEventRepository();

    const deleteEventUseCase = new DeleteEventUseCase(eventRepository);

    return new DeleteEventController(deleteEventUseCase);
};
